import { Router, Request, Response } from "express";
import { TimetableSlot } from "../models/Timetable";
import { Subject } from "../models/Subject";

const router = Router();

// Get timetable for a section
router.get("/:section", async (req: Request, res: Response) => {
  try {
    const { section } = req.params;
    
    const slots = await TimetableSlot.find({ section, active: true }).sort({ day: 1, timeSlot: 1 });
    
    // Get all subjects for this section to include metadata
    const subjects = await Subject.find({ section, active: true });
    const subjectMap = new Map(subjects.map(s => [s.code, s]));
    
    // Enrich slots with subject details
    const enrichedSlots = slots.map(slot => ({
      ...slot.toObject(),
      subject: subjectMap.get(slot.subjectCode),
    }));
    
    res.json({
      success: true,
      data: enrichedSlots,
    });
  } catch (error) {
    console.error("[Timetable API] Error fetching timetable:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch timetable",
    });
  }
});

// Create timetable slot (CR only)
router.post("/", async (req: any, res: Response) => {
  try {
    if (req.user?.role !== "cr") {
      return res.status(403).json({
        success: false,
        message: "Only CRs can create timetable slots",
      });
    }

    const { section, day, timeSlot, subjectCode, room } = req.body;

    const slot = new TimetableSlot({
      section: section || "E1",
      day,
      timeSlot,
      subjectCode,
      room: room || "311",
      active: true,
    });

    await slot.save();

    res.status(201).json({
      success: true,
      data: slot,
    });
  } catch (error: any) {
    console.error("[Timetable API] Error creating slot:", error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Slot already exists for this section, day, and time",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create timetable slot",
    });
  }
});

// Update timetable slot (CR only)
router.put("/:id", async (req: any, res: Response) => {
  try {
    if (req.user?.role !== "cr") {
      return res.status(403).json({
        success: false,
        message: "Only CRs can update timetable slots",
      });
    }

    const { id } = req.params;
    const updates = req.body;

    const slot = await TimetableSlot.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!slot) {
      return res.status(404).json({
        success: false,
        message: "Timetable slot not found",
      });
    }

    res.json({
      success: true,
      data: slot,
    });
  } catch (error) {
    console.error("[Timetable API] Error updating slot:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update timetable slot",
    });
  }
});

// Delete timetable slot (CR only)
router.delete("/:id", async (req: any, res: Response) => {
  try {
    if (req.user?.role !== "cr") {
      return res.status(403).json({
        success: false,
        message: "Only CRs can delete timetable slots",
      });
    }

    const { id } = req.params;

    const slot = await TimetableSlot.findByIdAndDelete(id);

    if (!slot) {
      return res.status(404).json({
        success: false,
        message: "Timetable slot not found",
      });
    }

    res.json({
      success: true,
      message: "Timetable slot deleted successfully",
    });
  } catch (error) {
    console.error("[Timetable API] Error deleting slot:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete timetable slot",
    });
  }
});

export default router;
