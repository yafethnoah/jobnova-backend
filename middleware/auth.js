const jwt = require("jsonwebtoken");

function extractBearerToken(authHeader = "") {
  if (!authHeader || typeof authHeader !== "string") return null;

  const trimmed = authHeader.trim();

  if (!trimmed.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  const token = trimmed.slice(7).trim();
  return token || null;
}

function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = extractBearerToken(authHeader);

    console.log("[AUTH] Incoming request:", {
      method: req.method,
      path: req.originalUrl,
      hasAuthorizationHeader: Boolean(authHeader),
      tokenPreview: token ? `${token.slice(0, 12)}...` : null,
    });

    if (!token) {
      console.log("[AUTH] No bearer token found");
      return res.status(401).json({
        message: "Authentication failed or the token is no longer valid.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      id: decoded.id || decoded.sub,
      email: decoded.email || null,
    };

    if (!req.user.id) {
      console.log("[AUTH] Token decoded but missing user id");
      return res.status(401).json({
        message: "Authentication failed or the token is no longer valid.",
      });
    }

    console.log("[AUTH] Token verified:", {
      userId: req.user.id,
      email: req.user.email,
    });

    next();
  } catch (error) {
    console.log("[AUTH] Verification failed:", error.message);
    return res.status(401).json({
      message: "Authentication failed or the token is no longer valid.",
    });
  }
}

module.exports = {
  requireAuth,
};