import { Router, Request, Response } from "express";
import { Subject } from "../models/Subject";

const router = Router();

// Get all active subjects for a section
router.get("/", async (req: Request, res: Response) => {
  try {
    const section = (req.query.section as string) || "E1";
    
    const subjects = await Subject.find({ section, active: true }).sort({ code: 1 });
    
    res.json({
      success: true,
      data: subjects,
    });
  } catch (error) {
    console.error("[Subjects API] Error fetching subjects:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch subjects",
    });
  }
});

// Create new subject (CR only)
router.post("/", async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== "cr") {
      return res.status(403).json({
        success: false,
        message: "Only CRs can create subjects",
      });
    }

    const { code, name, type, section, color } = req.body;

    const subject = new Subject({
      code,
      name,
      type,
      section: section || "E1",
      color: color || "from-gray-600 via-gray-500 to-gray-400",
      active: true,
    });

    await subject.save();

    res.status(201).json({
      success: true,
      data: subject,
    });
  } catch (error: any) {
    console.error("[Subjects API] Error creating subject:", error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Subject with this code already exists for this section",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create subject",
    });
  }
});

// Update subject (CR only)
router.put("/:id", async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== "cr") {
      return res.status(403).json({
        success: false,
        message: "Only CRs can update subjects",
      });
    }

    const { id } = req.params;
    const updates = req.body;

    const subject = await Subject.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }

    res.json({
      success: true,
      data: subject,
    });
  } catch (error) {
    console.error("[Subjects API] Error updating subject:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update subject",
    });
  }
});

// Deactivate subject (CR only)
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== "cr") {
      return res.status(403).json({
        success: false,
        message: "Only CRs can delete subjects",
      });
    }

    const { id } = req.params;

    const subject = await Subject.findByIdAndUpdate(
      id,
      { $set: { active: false } },
      { new: true }
    );

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }

    res.json({
      success: true,
      message: "Subject deactivated successfully",
    });
  } catch (error) {
    console.error("[Subjects API] Error deleting subject:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete subject",
    });
  }
});

export default router;
