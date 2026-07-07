import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

async function main() {
  try {
    const completion = await openai.chat.completions.create({
      model: "openai/gpt-4o-mini",
      // 💡 1. 응답 형식을 JSON으로 지정을 선언합니다.
      response_format: { type: "json_object" }, 
      messages: [
        {
          "role": "user",
          "content": [
            {
              "type": "text",
              // 💡 2. 프롬프트 안에 '어떤 구조의 JSON'을 원하는지 명확히 적어줍니다.
              "text": "이 이미지에 무엇이 보이나요? 결과를 반드시 { 'summary': '한줄요약', 'description': '상세설명' } 구조를 가진 JSON 형식으로만 답변해줘."
            },
            {
              "type": "image_url",
              "image_url": {
                "url": "https://live.staticflickr.com/3851/14825276609_098cac593d_b.jpg"
              }
            }
          ]
        }
      ]
    });

    // 💡 3. 문자열로 들어온 JSON 응답을 JavaScript 객체로 변환하여 출력합니다.
    const rawJson = (completion as any).choices[0]?.message?.content;
    const resultObj = JSON.parse(rawJson);

    console.log("🤖 AI 응답 결과 (JSON 객체):", resultObj);
    console.log("📝 요약만 쏙 빼오기:", resultObj.summary);

  } catch (error) {
    console.error("❌ 에러 발생:", error);
  }
}

main();