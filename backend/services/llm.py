from google import genai
import os
import concurrent.futures

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
MODEL =  "gemini-1.5-flash"



def _call_model(prompt: str ):

        response = client.models.generate_content(
            model=MODEL,
            contents=prompt,
            config={"temperature": 0, "max_output_tokens": 200},
        )
        
        if getattr(response, "text", None):
            return response.text
        
        try:
            return response.candidates[0].content.parts[0].text
        except Exception:
            return ""

        

def ask_llm(prompt: str, timeout_s: int = 20):
    
    with concurrent.futures.ThreadPoolExecutor() as executor:
        future = executor.submit(_call_model, prompt)
        
        try:
            result = future.result(timeout=timeout_s)
            return result if result else "I couldn't generate a response."
        except concurrent.futures.TimeoutError:
            return "The model took too long to respond.."
    
