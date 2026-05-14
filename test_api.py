import httpx
import asyncio

async def test_minimax():
    # 测试MiniMax API
    api_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiMiIsImlhdCI6MTc1MDc0ODU1NX0.KDShf6y0aYcfZqbvhzpN2K1dXMM4IoPQwbEohK_Sx7g'
    
    async with httpx.AsyncClient(timeout=30) as client:
        # 测试chat API
        response = await client.post(
            'https://api.minimax.chat/v1/text/chatcompletion_v2',
            headers={
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            },
            json={
                'model': 'MiniMax-M2.7-highspeed',
                'messages': [{'role': 'user', 'content': 'hi'}],
                'max_tokens': 20
            }
        )
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text[:500]}")

asyncio.run(test_minimax())
