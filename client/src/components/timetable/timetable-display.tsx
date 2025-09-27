import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

const E1Schedule = {
  "10:30 AM\n—\n11:30 AM": {
    Monday: { text: "CG", bg: "from-green-600 via-green-500 to-green-400" },
    Thursday: { text: "CC", bg: "from-blue-600 via-blue-500 to-blue-400" },
  },
  "11:30 AM\n—\n12:30 PM": {
    Monday: { text: "CC", bg: "from-blue-600 via-blue-500 to-blue-400" },
    Tuesday: { text: "CG", bg: "from-green-600 via-green-500 to-green-400" },
    Wednesday: {
      text: "OS",
      bg: "from-purple-600 via-purple-500 to-purple-400",
    },
    Thursday: {
      text: "OS",
      bg: "from-purple-600 via-purple-500 to-purple-400",
    },
    Friday: { text: "OS", bg: "from-purple-600 via-purple-500 to-purple-400" },
  },
  "12:30 PM\n—\n01:30 PM": {
    Monday: { text: "OS", bg: "from-purple-600 via-purple-500 to-purple-400" },
    Tuesday: { text: "CC", bg: "from-blue-600 via-blue-500 to-blue-400" },
    Wednesday: { text: "CG", bg: "from-green-600 via-green-500 to-green-400" },
    Thursday: { text: "CG", bg: "from-green-600 via-green-500 to-green-400" },
    Friday: { text: "CC", bg: "from-blue-600 via-blue-500 to-blue-400" },
  },
  "01:30 PM\n—\n02:30 PM": {
    Monday: { text: "BREAK", bg: "from-red-500 via-red-400 to-red-300" },
    Tuesday: { text: "BREAK", bg: "from-red-500 via-red-400 to-red-300" },
    Wednesday: {
      text: "CG Lab 4",
      bg: "from-green-700 via-green-600 to-green-500",
    },
    Thursday: { text: "BREAK", bg: "from-red-500 via-red-400 to-red-300" },
    Friday: { text: "BREAK", bg: "from-red-500 via-red-400 to-red-300" },
  },
  "02:30 PM\n—\n03:30 PM": {
    Monday: {
      text: "CG Lab 4",
      bg: "from-green-700 via-green-600 to-green-500",
    },
    Tuesday: {
      text: "CG Lab 4",
      bg: "from-green-700 via-green-600 to-green-500",
    },
    Wednesday: { text: "BREAK", bg: "from-red-500 via-red-400 to-red-300" },
    Thursday: {
      text: "CG Lab 4",
      bg: "from-green-700 via-green-600 to-green-500",
    },
    Friday: {
      text: "ML Lab 4",
      bg: "from-orange-600 via-orange-500 to-orange-400",
    },
  },
  "03:30 PM\n—\n04:30 PM": {
    Monday: { text: "ML", bg: "from-orange-600 via-orange-500 to-orange-400" },
    Tuesday: {
      text: "Linux Lab 4",
      bg: "from-blue-700 via-blue-600 to-blue-500",
    },
    Wednesday: {
      text: "Linux Lab 4",
      bg: "from-blue-700 via-blue-600 to-blue-500",
    },
    Thursday: {
      text: "ML",
      bg: "from-orange-600 via-orange-500 to-orange-400",
    },
    Friday: {
      text: "Linux Lab 4",
      bg: "from-blue-700 via-blue-600 to-blue-500",
    },
  },
  "04:30 PM\n—\n05:30 PM": {
    Monday: {
      text: "ML Lab 4",
      bg: "from-orange-600 via-orange-500 to-orange-400",
    },
    Tuesday: { text: "", bg: "from-gray-800 to-gray-700" },
    Wednesday: {
      text: "ML",
      bg: "from-orange-600 via-orange-500 to-orange-400",
    },
    Thursday: {
      text: "Linux Lab 4",
      bg: "from-blue-700 via-blue-600 to-blue-500",
    },
    Friday: { text: "ML", bg: "from-orange-600 via-orange-500 to-orange-400" },
  },
};

export default function TimetableDisplay() {
  const timeSlots = Object.keys(E1Schedule);
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  return (
    <div className="space-y-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Class Schedule E1 - Computer Science Semester 5
          </CardTitle>
          <p className="text-center text-gray-600">
            Weekly Timetable for Section E1
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 gap-2 rounded-xl overflow-hidden">
            {/* Header - Time slot */}
            <div className="p-3 font-bold text-white bg-gray-800 rounded-lg text-lg shadow-inner flex items-center justify-center h-20">
              Time
            </div>

            {/* Headers - Days */}
            {days.map((day) => (
              <div
                key={day}
                className="p-3 font-bold text-white text-center bg-gray-800 rounded-lg text-lg shadow-inner flex items-center justify-center h-20"
              >
                {day}
              </div>
            ))}

            {/* Time slots and schedule */}
            {timeSlots.map((timeSlot) => (
              <React.Fragment key={timeSlot}>
                {/* Time slot */}
                <div className="p-3 font-semibold text-white bg-gray-800 rounded-lg text-sm shadow-inner flex flex-col items-center justify-center h-20 whitespace-pre-line">
                  {timeSlot}
                </div>

                {/* Schedule cells */}
                {days.map((day) => {
                  const daySchedule =
                    E1Schedule[timeSlot as keyof typeof E1Schedule]?.[
                      day as keyof (typeof E1Schedule)[keyof typeof E1Schedule]
                    ];
                  const cellBg = daySchedule?.bg || "from-gray-800 to-gray-700";
                  const cellText = daySchedule?.text || "";

                  return (
                    <div
                      key={`${timeSlot}-${day}`}
                      className={`p-2 flex flex-col items-center justify-center rounded-lg shadow-lg transition-all bg-gradient-to-br ${cellBg} h-20 overflow-hidden hover:scale-105 cursor-pointer`}
                      title={
                        cellText
                          ? `${cellText} - ${timeSlot.replace("\n", " ")}`
                          : "Free Period"
                      }
                    >
                      <span className="text-lg font-bold text-white text-center drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                        {cellText}
                      </span>
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>

          {/* Subject Legend */}
          <div className="mt-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Subject Legend
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded bg-gradient-to-br from-green-600 via-green-500 to-green-400"></div>
                <span className="text-sm font-medium">
                  CG - Computer Graphics
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-600 via-blue-500 to-blue-400"></div>
                <span className="text-sm font-medium">
                  CC - Cloud Computing
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded bg-gradient-to-br from-purple-600 via-purple-500 to-purple-400"></div>
                <span className="text-sm font-medium">
                  OS - Operating System
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded bg-gradient-to-br from-orange-600 via-orange-500 to-orange-400"></div>
                <span className="text-sm font-medium">
                  ML - Machine Learning
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded bg-gradient-to-br from-green-700 via-green-600 to-green-500"></div>
                <span className="text-sm font-medium">
                  CG Lab 4 - Graphics Lab
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded bg-gradient-to-br from-orange-600 via-orange-500 to-orange-400"></div>
                <span className="text-sm font-medium">ML Lab 4 - ML Lab</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500"></div>
                <span className="text-sm font-medium">
                  Linux Lab 4 - Linux Lab
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded bg-gradient-to-br from-red-500 via-red-400 to-red-300"></div>
                <span className="text-sm font-medium">BREAK - Break Time</span>
              </div>
            </div>
          </div>

          {/* Weekly Summary */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              Weekly Summary
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="bg-white p-3 rounded shadow-sm">
                <div className="font-semibold text-gray-700">Total Classes</div>
                <div className="text-2xl font-bold text-blue-600">28</div>
                <div className="text-xs text-gray-500">per week</div>
              </div>
              <div className="bg-white p-3 rounded shadow-sm">
                <div className="font-semibold text-gray-700">Subjects</div>
                <div className="text-2xl font-bold text-green-600">7</div>
                <div className="text-xs text-gray-500">different subjects</div>
              </div>
              <div className="bg-white p-3 rounded shadow-sm">
                <div className="font-semibold text-gray-700">Lab Sessions</div>
                <div className="text-2xl font-bold text-purple-600">12</div>
                <div className="text-xs text-gray-500">per week</div>
              </div>
              <div className="bg-white p-3 rounded shadow-sm">
                <div className="font-semibold text-gray-700">Class Hours</div>
                <div className="text-2xl font-bold text-orange-600">28</div>
                <div className="text-xs text-gray-500">per week</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
