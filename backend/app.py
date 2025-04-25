from flask import Flask, request
from flask_restx import Api, Resource, fields
from app.utils.s3_utils import upload_file_to_s3, check_bucket_exists, download_file_from_s3
import os

app = Flask(__name__)
api = Api(app, version='1.0', title='S3 Upload API', description='Upload files to AWS S3')

upload_ns = api.namespace('upload', description='Upload operations')
download_ns = api.namespace('download', description='Download operations')

upload_model = api.model('Upload', {
    'file': fields.String(description='The file to upload', required=True),
})

@upload_ns.route('/')
class UploadResource(Resource):
    @api.doc(description="Upload a file to S3")
    @api.expect(api.parser().add_argument('file', location='files', type='file', required=True))
    def post(self):
        args = request.files
        if 'file' not in args:
            return {'message': 'No file part'}, 400
        file = args['file']
        filename = file.filename
        temp_path = os.path.join('temp', filename)
        os.makedirs('temp', exist_ok=True)
        file.save(temp_path)

        try:
            check_bucket_exists()
            upload_file_to_s3(temp_path, filename)
            os.remove(temp_path)
            return {'message': f'{filename} uploaded successfully!'}, 200
        except Exception as e:
            return {'error': str(e)}, 500

@download_ns.route('/<string:key>')
class DownloadResource(Resource):
    @api.doc(description="Download a file from S3")
    def get(self, key):
        try:
            os.makedirs('downloads', exist_ok=True)
            local_filename = key.split('/')[-1]
            download_path = os.path.join('downloads', local_filename)
            download_file_from_s3(key, download_path)
            return {'message': f'{key} downloaded successfully to {download_path}'}, 200
        except Exception as e:
            return {'error': str(e)}, 500

if __name__ == '__main__':
    app.run(debug=True)
