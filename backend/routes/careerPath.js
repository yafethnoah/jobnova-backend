const express = require("express");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/generate", requireAuth, async (req, res) => {
  try {
    console.log("[CAREER PATH] Request received:", {
      userId: req.user?.id || null,
      email: req.user?.email || null,
      body: req.body,
    });

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        message: "Authentication failed or the token is no longer valid.",
      });
    }

    const {
      profession,
      lifeStage,
      yearsExperience,
      educationLevel,
      englishLevel,
      targetGoal,
      urgencyLevel,
    } = req.body || {};

    const result = {
      success: true,
      generatedAt: new Date().toISOString(),
      profile: {
        profession: profession || "Unknown",
        lifeStage: lifeStage || "Unknown",
        yearsExperience: yearsExperience || "",
        educationLevel: educationLevel || "",
        englishLevel: englishLevel || "",
        targetGoal: targetGoal || "",
        urgencyLevel: urgencyLevel || "",
      },
      suggestedDirection:
        "Begin with bridge-friendly roles that build Canadian experience while targeting your longer-term professional path.",
      paths: [
        {
          type: "primary",
          title: profession || "Career Path",
          timeline: "3–6 months",
          nextSteps: [
            "Tailor your resume to the target role",
            "Apply to bridge-friendly positions",
            "Practice role-specific interviews",
          ],
        },
        {
          type: "alternative",
          title: "Related bridge role",
          timeline: "1–3 months",
          nextSteps: [
            "Strengthen transferable skills",
            "Network with professionals in Ontario",
            "Track applications and follow-ups",
          ],
        },
      ],
    };

    console.log("[CAREER PATH] Success response:", {
      userId: req.user.id,
      profession: profession || null,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("[CAREER PATH] Route failed:", error);
    return res.status(500).json({
      message: "Career path generation failed.",
    });
  }
});

module.exports = router;