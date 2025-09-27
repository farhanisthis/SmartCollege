// Test script to verify deadline color logic
// Today is September 21, 2025

const { formatDistanceToNow, format, isValid } = require("date-fns");

const formatDeadlineTag = (deadlineDate) => {
  if (!deadlineDate) return null;

  try {
    const date = new Date(deadlineDate);
    if (!isValid(date)) return null;

    // Calculate days difference from today
    const today = new Date("2025-09-21"); // Current date
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(date);
    deadline.setHours(0, 0, 0, 0);

    const timeDiff = deadline.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    // Format as "22nd Sep Monday"
    const day = date.getDate();
    const month = format(date, "MMM");
    const weekday = format(date, "EEEE");

    const getOrdinalSuffix = (day) => {
      if (day >= 11 && day <= 13) return "th";
      switch (day % 10) {
        case 1:
          return "st";
        case 2:
          return "nd";
        case 3:
          return "rd";
        default:
          return "th";
      }
    };

    const formattedText = `${day}${getOrdinalSuffix(day)} ${month} ${weekday}`;

    // Determine color based on days difference
    let colorDescription = "";
    if (daysDiff < 0) {
      colorDescription = "🔴 Past deadline - Dark red (bg-red-200)";
    } else if (daysDiff === 0) {
      colorDescription = "🟢 Same day - Green (bg-green-200)";
    } else if (daysDiff === 1) {
      colorDescription = "🟠 Tomorrow - Amber/Orange (bg-amber-200)";
    } else if (daysDiff <= 3) {
      colorDescription = "🔴 2-3 days - Light red urgent (bg-red-150)";
    } else if (daysDiff <= 7) {
      colorDescription = "🟡 4-7 days - Yellow soon (bg-yellow-200)";
    } else {
      colorDescription = "🔵 >7 days - Blue future (bg-blue-200)";
    }

    return {
      text: formattedText,
      colorDescription,
      daysDiff,
    };
  } catch (error) {
    console.error("Error formatting deadline date:", error);
    return null;
  }
};

console.log("=== Testing Deadline Color Logic ===");
console.log("Current Date: September 21, 2025\n");

const testDates = [
  { date: "2025-09-20", description: "Yesterday (past deadline)" },
  { date: "2025-09-21", description: "Today (same day)" },
  { date: "2025-09-22", description: "Tomorrow" },
  { date: "2025-09-23", description: "Day after tomorrow (2 days)" },
  { date: "2025-09-24", description: "3 days away" },
  { date: "2025-09-26", description: "5 days away" },
  { date: "2025-09-28", description: "1 week away" },
  { date: "2025-10-01", description: "10 days away" },
];

testDates.forEach(({ date, description }) => {
  const result = formatDeadlineTag(date);
  if (result) {
    console.log(`${description}:`);
    console.log(`  Date: ${result.text}`);
    console.log(`  Days Diff: ${result.daysDiff}`);
    console.log(`  Color: ${result.colorDescription}`);
    console.log("");
  }
});

console.log("=== Expected Behavior ===");
console.log("🟢 Green: Same day as posted");
console.log("🟠 Amber: Tomorrow (1 day)");
console.log("🔴 Red: Very close (2-3 days) or past deadline");
console.log("🟡 Yellow: Coming soon (4-7 days)");
console.log("🔵 Blue: Future (>7 days)");
