export const validate = schema => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: result.error.issues.map(issue => ({
        // Join path with comma
        field: issue.path.join(","),
        message: issue.message,
      })),
    });
  }

  // Replace the request body with validated, parsed data.
  req.body = result.data;

  next();
};