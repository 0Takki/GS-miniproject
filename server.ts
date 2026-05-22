import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const symptomMap: Record<string, string> = {
  // Wrinkles
  '이마가로주름': 'forehead horizontal wrinkles',
  '미간내천자주름': 'glabella frown lines',
  '눈가주름': "crow's feet wrinkles",
  '콧등주름': 'bridge of nose wrinkles',
  '팔자주름': 'nasolabial folds',
  '입술주름': 'perioral lip lines',
  '눈밑잔주름': 'under-eye fine lines',
  '목주름': 'neck wrinkles',
  // Elasticity
  '둔탁한U라인턱선': 'sagging U-line jawline',
  '불독살': 'jowls sagging cheeks',
  '이중턱': 'double chin',
  '처진눈꺼풀': 'drooping upper eyelids',
  '눈밑지방주머니': 'under-eye bags',
  '입꼬리처짐': 'drooping mouth corners',
  '앞볼처짐': 'sagging mid-face cheeks',
  '눈꼬리처짐': 'drooping outer eye corners',
  // Volume
  '퀭한눈두덩이': 'sunken upper eyelids',
  '눈물고랑패임': 'deep tear troughs',
  '옆볼꺼짐': 'hollow side cheeks',
  '관자놀이꺼짐': 'sunken temples',
  '이마볼륨평면화': 'flat forehead volume',
  '뼈윤곽부각': 'prominent skeletal facial contours',
  // Dark Spots
  '광대뼈갈색기미': 'brown melasma on cheekbones',
  '짙은검버섯': 'dark age spots',
  '눈밑잡티': 'under-eye blemishes',
  '콧등주근깨': 'freckles on nose bridge',
  '비대칭잡티': 'asymmetrical dark spots',
  '흑자': 'lentigo',
  '트러블흔적색소': 'post-inflammatory hyperpigmentation',
  // Tone
  '안면홍조': 'facial flushing and redness',
  '모세혈관확장': 'telangiectasia spider veins',
  '불균일한톤': 'uneven skin tone',
  // Pores
  '타원형세로모공': 'enlarged oval vertical pores',
  '모공주름': 'pore-related texture wrinkles',
  '블랙헤드': 'congested blackheads',
  '콧볼옆귤껍질모공': 'orange-peel texture pores on nasal alas',
  '이마모공': 'visible forehead pores'
};

const categoryMap: Record<string, string[]> = {
  '주름': ['이마가로주름', '미간내천자주름', '눈가주름', '콧등주름', '팔자주름', '입술주름', '눈밑잔주름', '목주름'],
  '탄력 저하': ['둔탁한U라인턱선', '불독살', '이중턱', '처진눈꺼풀', '눈밑지방주머니', '입꼬리처짐', '앞볼처짐', '눈꼬리처짐'],
  '볼륨 꺼짐': ['퀭한눈두덩이', '눈물고랑패임', '옆볼꺼짐', '관자놀이꺼짐', '이마볼륨평면화', '뼈윤곽부각'],
  '기미 잡티': ['광대뼈갈색기미', '짙은검버섯', '눈밑잡티', '콧등주근깨', '비대칭잡티', '흑자', '트러블흔적색소'],
  '피부톤': ['안면홍조', '모세혈관확장', '불균일한톤'],
  '모공': ['타원형세로모공', '모공주름', '블랙헤드', '콧볼옆귤껍질모공', '이마모공']
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  app.post("/api/generate", async (req, res) => {
    try {
      const { image, selectedSymptoms, intensity, width, height, mimeType } = req.body;

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "Gemini API Key is not configured in the Secrets panel." });
      }

      if (!image || !selectedSymptoms || !selectedSymptoms.length) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Identify selected categories and their English symptoms
      const selectedEnSymptoms = selectedSymptoms.map((s: string) => symptomMap[s] || s);
      const selectedCategories = Object.keys(categoryMap).filter(cat => 
        categoryMap[cat].some(s => selectedSymptoms.includes(s))
      );

      // Intensity logic
      const intensityWord = intensity >= 5 ? "extreme deep carved" : 
                           intensity >= 4 ? "severe heavy" :
                           intensity >= 3 ? "moderate visible" :
                           intensity >= 2 ? "slight" : "faint";

      const symptomsStr = selectedEnSymptoms.join(", ");
      
      // Rule 1: Front-Loading with :1.5 weight
      const positivePrompt = `((${intensityWord} ${symptomsStr}:1.5)), raw realistic unretouched skin texture, flat studio lighting, exact facial identity maintained, match source resolution, high resolution skin detail, authentic skin imperfections, 4k ultra realistic.`;
      
      // Rule 2: Dynamic Negative Exclusion
      const excludedSymptoms: string[] = [];
      Object.keys(categoryMap).forEach(cat => {
        if (!selectedCategories.includes(cat)) {
          // Add all symptoms of excluded categories to negative
          categoryMap[cat].forEach(s => {
            if (symptomMap[s]) excludedSymptoms.push(symptomMap[s]);
          });
        }
      });

      const negativePrompt = `beauty filter, CGI, smooth skin, airbrushed, makeup, retouched, flawless, young, bright lighting, high key, blurry, lowres, distorted, cartoon, 3d render, anime, ${excludedSymptoms.join(", ")}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: {
          parts: [
            {
              inlineData: {
                data: image.split(',')[1] || image,
                mimeType: mimeType || "image/png",
              },
            },
            {
              text: positivePrompt,
            },
          ],
        },
        config: {
          systemInstruction: `You are a professional beauty visualization engine for home shopping broadcasting. Your goal is to accurately visualize skin "BEFORE" conditions on a model image while maintaining 100% identity and pixel-perfect resolution. 
          STRICT NEGATIVE CONSTRAINTS: ${negativePrompt}`,
          imageConfig: {
             imageSize: "2K" 
          }
        },
      });

      let generatedBase64 = null;
      let partText = "";

      // Find the image part in the response
      if (response.candidates && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            generatedBase64 = part.inlineData.data;
          } else if (part.text) {
             partText += part.text;
          }
        }
      }

      if (!generatedBase64) {
        return res.status(500).json({ error: "No image generated", details: partText });
      }

      res.json({
        positivePrompt,
        negativePrompt,
        imageUrl: `data:image/png;base64,${generatedBase64}`,
      });

    } catch (error: any) {
      console.error("Generation Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate image" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
