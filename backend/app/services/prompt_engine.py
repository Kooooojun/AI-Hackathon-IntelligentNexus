def build_prompt(description: str, style_tags=None) -> str:
    """
    Very naive prompt composer.  
    之後可改成：從品牌 DNA、歷史資料庫撈元素再組裝。
    """
    style_text = ", ".join(style_tags or [])
    prompt = f"{description}. Style: {style_text}. High-resolution product shot."
    return prompt.strip()
