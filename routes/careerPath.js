router.post('/generate', async (req, res) => {
  try {
    const payload = {
      lifeStage: req.body?.lifeStage || '',
      profession: req.body?.profession || req.body?.targetRole || '',
      yearsExperience: req.body?.yearsExperience || '',
      educationLevel: req.body?.educationLevel || '',
      englishLevel: req.body?.englishLevel || '',
      frenchLevel: req.body?.frenchLevel || '',
      hasCanadianExperience: req.body?.hasCanadianExperience || false,
      targetGoal: req.body?.targetGoal || '',
      urgencyLevel: req.body?.urgencyLevel || 'medium'
    };

    let result;

    try {
      result = await generateCareerPath(payload);
    } catch (aiError) {
      console.error("AI FAILED → using fallback:", aiError.message);

      // 🔥 FALLBACK SYSTEM (CRITICAL)
      result = {
        summary: `Start with bridge roles aligned with ${payload.profession}. Build Canadian experience and transition to your target role.`,
        steps: [
          "Apply to entry/bridge roles",
          "Gain Canadian experience",
          "Upskill with certifications",
          "Network and transition to target role"
        ]
      };
    }

    const targetRole = payload.profession;

    const updatedUser = updateUser(req.user.id, {
      onboardingCompleted: true,
      targetRole
    });

    req.userData.careerPath = {
      id: `cp-${Date.now()}`,
      payload,
      result,
      createdAt: new Date().toISOString()
    };

    await saveState();

    return res.json({
      ok: true,
      result,
      careerPath: req.userData.careerPath,
      user: updatedUser
    });

  } catch (error) {
    console.error("FATAL ERROR:", error);
    return res.status(500).json({
      ok: false,
      message: "Career path generation failed",
      error: error.message
    });
  }
});