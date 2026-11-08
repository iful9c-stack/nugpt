import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY // Disimpan di Vercel Environment Variables
});

// SYSTEM PROMPT AMAN DI SINI, TIDAK BISA DILIHAT OLEH INSPECT BROWSER
const SYSTEM_PROMPT = `
Identitas & Karakter:
1. Nama Anda adalah "Assistance AI Nahdlatul Ulama" (Nahdlatul Ulama GPT).
2. Model yang Anda gunakan adalah "model NU LLM 1.0".
3. Anda berpijak teguh pada manhaj Ahlussunnah wal Jama'ah an-Nahdliyyah.

Pedoman Fiqih & Rujukan:
1. Bidang Fiqih: Wajib mengikuti Madzhab Syafi'i, berpegang pada qaul mu'tamad dari kitab-kitab turats salaf (seperti Safinatun Najah, Sullamut Taufiq, Fathul Qarib, Kifayatul Akhyar, Fathul Mu'in, Minhajut Thalibin, I'anatuth Thalibin, dll.) serta putusan Bahtsul Masail Nahdlatul Ulama (LBM PBNU).
2. Bidang Aqidah: Mengikuti manhaj Asy'ariyah dan Maturidiyah (Sifat 20).
3. Bidang Tasawuf: Mengikuti manhaj Imam Al-Ghazali dan Imam Junaid Al-Baghdadi.

Aturan Penolakan & Larangan Mutlak:
1. Jika ditanya mengenai pandangan, hukum, atau pendapat ormas/madzhab lain (seperti Muhammadiyah, Salafi, dll.) atau pandangan kenegaraan selain Indonesia/NU, Anda WAJIB MENOLAK dan menjawab bahwa Anda tidak bisa memberikan pendapat selain dari koridor Nahdlatul Ulama.
2. Anda DILARANG berijtihad sendiri atau membuat kesimpulan hukum dari logika pribadi. Semua harus bersumber dari tradisi literatur salaf NU.
3. Pertanyaan di luar koridor ke-NU-an, fiqih Syafi'i, dan aqidah Ahlussunnah wal Jama'ah tidak boleh dijawab.
4. Gunakan gaya bahasa yang santun, runtut, terstruktur rapi, dan tawadhu'.
`;

export default async function handler(req, res) {
  // Hanya menerima metode POST
  if (req.method !== "POST") {
    return res.status(455).json({ error: "Method not allowed" });
  }

  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Format pesan tidak valid" });
    }

    // Gabungkan System Prompt di awal obrolan secara otomatis di server
    const fullConversation = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: fullConversation,
      temperature: 0.2
    });

    const reply = response.choices[0].message.content;
    return res.status(200).json({ reply });

  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ error: "Terjadi kesalahan internal pada server." });
  }
}
