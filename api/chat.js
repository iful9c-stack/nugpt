// SYSTEM PROMPT RAHASIA (Tersimpan di serverless Vercel, aman dari inspect element)
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
  // Hanya menerima method POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch (e) {
        return res.status(400).json({ error: "Invalid JSON format" });
      }
    }

    const messages = body?.messages;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Format pesan tidak valid atau kosong" });
    }

    // Suntikkan System Prompt rahasia di urutan teratas
    const fullConversation = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages
    ];

    // Panggil 9router endpoint Antigravity Gemini
    const response = await fetch("http://77.237.238.127:20128/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer sk-009776894202163a-1lh99d-40d458b2"
      },
      body: JSON.stringify({
        // Model Gemini Antigravity di 9router Anda
        // Jika nama model di dashboard 9router Anda berbeda, sesuaikan string ini
        // (contoh: "gemini-1.5-flash", "gemini-2.0-flash", atau "gemini-1.5-pro")
        model: "gemini-1.5-flash",
        messages: fullConversation,
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("9router Antigravity Error:", errText);
      return res.status(response.status).json({ 
        error: `Error dari 9router (${response.status}): ${errText}` 
      });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "Tidak ada respon dari model.";

    return res.status(200).json({ reply });

  } catch (error) {
    console.error("Internal Server Error:", error);
    return res.status(500).json({ 
      error: error.message || "Gagal menghubungi backend 9router Antigravity Gemini." 
    });
  }
}
