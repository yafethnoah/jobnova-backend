const express = require("express");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);

router.post("/rewrite", async (req, res) => {
  try {
    const { resumeText, targetRole, jobDescription } = req.body || {};

    if (!resumeText || typeof resumeText !== "string") {
      return res.status(400).json({
        message: "resumeText is required.",
      });
    }

    const safeTargetRole =
      typeof targetRole === "string" && targetRole.trim()
        ? targetRole.trim()
        : "the target role";

    const safeJobDescription =
      typeof jobDescription === "string" ? jobDescription.trim() : "";

    const rewritten = [
      `Professional Summary`,
      `Results-driven candidate targeting ${safeTargetRole} with transferable experience presented in clear, ATS-friendly language.`,
      ``,
      `Optimized Experience`,
      `• Rewrote resume content to align with the expectations of ${safeTargetRole}.`,
      `• Highlighted relevant responsibilities, transferable skills, and practical impact.`,
      `• Improved clarity, structure, and keyword alignment for applicant tracking systems.`,
      ``,
      `Notes`,
      safeJobDescription
        ? `Tailored against the provided job description.`
        : `No job description was provided, so this version was optimized more generally.`,
      ``,
      `Original Content`,
      resumeText,
    ].join("\n");

    return res.status(200).json({
      success: true,
      rewrittenText: rewritten,
      suggestions: [
        "Use strong action verbs",
        "Keep bullet points concise",
        "Add measurable impact where truthful",
      ],
    });
  } catch (error) {
    console.error("[RESUME] rewrite failed:", error);
    return res.status(500).json({
      message: "Resume rewrite failed.",
    });
  }
});

router.post("/ats-check", async (req, res) => {
  try {
    const { resumeText, jobDescription } = req.body || {};

    if (!resumeText || !jobDescription) {
      return res.status(400).json({
        message: "resumeText and jobDescription are required.",
      });
    }

    const resumeWords = String(resumeText)
      .toLowerCase()
      .split(/\W+/)
      .filter(Boolean);

    const jdWords = String(jobDescription)
      .toLowerCase()
      .split(/\W+/)
      .filter(Boolean);

    const keywords = [...new Set(jdWords.filter((word) => word.length > 4))];
    const matchedKeywords = keywords.filter((word) => resumeWords.includes(word));
    const missingKeywords = keywords.filter((word) => !resumeWords.includes(word));

    const score = keywords.length
      ? Math.max(35, Math.min(98, Math.round((matchedKeywords.length / keywords.length) * 100)))
      : 60;

    return res.status(200).json({
      success: true,
      score,
      matchedKeywords: matchedKeywords.slice(0, 15),
      missingKeywords: missingKeywords.slice(0, 15),
      suggestions: [
        "Match important keywords naturally",
        "Use standard section headings",
        "Keep formatting simple for ATS parsing",
      ],
    });
  } catch (error) {
    console.error("[RESUME] ats-check failed:", error);
    return res.status(500).json({
      message: "ATS check failed.",
    });
  }
});

module.exports = router;