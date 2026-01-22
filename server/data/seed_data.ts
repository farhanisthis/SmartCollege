
export const subjects = [
  {
    code: "DWDM",
    name: "Data Warehousing & Data Mining",
    type: "theory",
    section: "E1",
    color: "from-purple-600 via-purple-500 to-purple-400",
  },
  {
    code: "e-com",
    name: "e-Commerce",
    type: "theory",
    section: "E1",
    color: "from-pink-600 via-pink-500 to-pink-400",
  },
  {
    code: "IOT",
    name: "Internet of Things",
    type: "theory",
    section: "E1",
    color: "from-blue-600 via-blue-500 to-blue-400",
  },
  {
    code: "DVA",
    name: "Data Visualization & Analytics",
    type: "theory",
    section: "E1",
    color: "from-green-600 via-green-500 to-green-400",
  },
  {
    code: "DL",
    name: "Deep Learning with Python",
    type: "theory",
    section: "E1",
    color: "from-indigo-600 via-indigo-500 to-indigo-400",
  },
  {
    code: "MP",
    name: "Major Project",
    type: "theory",
    section: "E1",
    color: "from-orange-600 via-orange-500 to-orange-400",
  },
  {
    code: "IOT Lab1",
    name: "Internet of Things Lab",
    type: "lab",
    section: "E1",
    color: "from-blue-700 via-blue-600 to-blue-500",
  },
  {
    code: "DVA Lab 4",
    name: "Data Visualization & Analytics Lab",
    type: "lab",
    section: "E1",
    color: "from-green-700 via-green-600 to-green-500",
  },
  {
    code: "DL Lab 5",
    name: "Deep Learning with Python Lab",
    type: "lab",
    section: "E1",
    color: "from-indigo-700 via-indigo-600 to-indigo-500",
  },
  {
    code: "MP Lab1",
    name: "Major Project Lab",
    type: "lab",
    section: "E1",
    color: "from-orange-700 via-orange-600 to-orange-500",
  },
  {
    code: "MP 212",
    name: "Major Project (Room 212)",
    type: "theory",
    section: "E1",
    color: "from-orange-600 via-orange-500 to-orange-400",
  },
  {
    code: "DVA 311",
    name: "Data Visualization & Analytics (Room 311)",
    type: "theory",
    section: "E1",
    color: "from-green-600 via-green-500 to-green-400",
  },
  {
    code: "DL 312",
    name: "Deep Learning with Python (Room 312)",
    type: "theory",
    section: "E1",
    color: "from-indigo-600 via-indigo-500 to-indigo-400",
  },
  {
    code: "BREAK",
    name: "Break",
    type: "theory",
    section: "E1",
    color: "from-red-500 via-red-400 to-red-300",
  },
];

export const timetable = [
  // Monday
  { section: "E1", day: "Monday", timeSlot: "10:30 AM - 11:30 AM", subjectCode: "-", room: "311" },
  { section: "E1", day: "Monday", timeSlot: "11:30 AM - 12:30 PM", subjectCode: "DVA 311", room: "311" },
  { section: "E1", day: "Monday", timeSlot: "12:30 PM - 01:30 PM", subjectCode: "IOT", room: "311" },
  { section: "E1", day: "Monday", timeSlot: "01:30 PM - 02:30 PM", subjectCode: "BREAK", room: "311" },
  { section: "E1", day: "Monday", timeSlot: "02:30 PM - 03:30 PM", subjectCode: "IOT Lab1", room: "311" },
  { section: "E1", day: "Monday", timeSlot: "03:30 PM - 04:30 PM", subjectCode: "e-com", room: "311" },

  // Tuesday
  { section: "E1", day: "Tuesday", timeSlot: "10:30 AM - 11:30 AM", subjectCode: "IOT Lab1", room: "311" },
  { section: "E1", day: "Tuesday", timeSlot: "11:30 AM - 12:30 PM", subjectCode: "DVA 311", room: "311" },
  { section: "E1", day: "Tuesday", timeSlot: "12:30 PM - 01:30 PM", subjectCode: "BREAK", room: "311" },
  { section: "E1", day: "Tuesday", timeSlot: "01:30 PM - 02:30 PM", subjectCode: "IOT", room: "311" },
  { section: "E1", day: "Tuesday", timeSlot: "02:30 PM - 03:30 PM", subjectCode: "DWDM", room: "311" },
  { section: "E1", day: "Tuesday", timeSlot: "03:30 PM - 04:30 PM", subjectCode: "e-com", room: "311" },

  // Wednesday
  { section: "E1", day: "Wednesday", timeSlot: "10:30 AM - 11:30 AM", subjectCode: "IOT", room: "311" },
  { section: "E1", day: "Wednesday", timeSlot: "11:30 AM - 12:30 PM", subjectCode: "DVA 311", room: "311" },
  { section: "E1", day: "Wednesday", timeSlot: "12:30 PM - 01:30 PM", subjectCode: "BREAK", room: "311" },
  { section: "E1", day: "Wednesday", timeSlot: "01:30 PM - 02:30 PM", subjectCode: "DVA Lab 4", room: "311" },
  { section: "E1", day: "Wednesday", timeSlot: "02:30 PM - 03:30 PM", subjectCode: "DWDM", room: "311" },
  { section: "E1", day: "Wednesday", timeSlot: "03:30 PM - 04:30 PM", subjectCode: "e-com", room: "311" },

  // Thursday
  { section: "E1", day: "Thursday", timeSlot: "10:30 AM - 11:30 AM", subjectCode: "IOT Lab1", room: "311" },
  { section: "E1", day: "Thursday", timeSlot: "11:30 AM - 12:30 PM", subjectCode: "DVA 311", room: "311" },
  { section: "E1", day: "Thursday", timeSlot: "12:30 PM - 01:30 PM", subjectCode: "BREAK", room: "311" },
  { section: "E1", day: "Thursday", timeSlot: "01:30 PM - 02:30 PM", subjectCode: "DWDM", room: "311" },
  { section: "E1", day: "Thursday", timeSlot: "02:30 PM - 03:30 PM", subjectCode: "e-com", room: "311" },
  { section: "E1", day: "Thursday", timeSlot: "03:30 PM - 04:30 PM", subjectCode: "MP Lab1", room: "311" },

  // Friday
  { section: "E1", day: "Friday", timeSlot: "10:30 AM - 11:30 AM", subjectCode: "-", room: "311" },
  { section: "E1", day: "Friday", timeSlot: "11:30 AM - 12:30 PM", subjectCode: "IOT Lab1", room: "311" },
  { section: "E1", day: "Friday", timeSlot: "12:30 PM - 01:30 PM", subjectCode: "IOT", room: "311" },
  { section: "E1", day: "Friday", timeSlot: "01:30 PM - 02:30 PM", subjectCode: "DVA Lab 4", room: "311" },
  { section: "E1", day: "Friday", timeSlot: "02:30 PM - 03:30 PM", subjectCode: "DWDM", room: "311" },
  { section: "E1", day: "Friday", timeSlot: "03:30 PM - 04:30 PM", subjectCode: "MP 212", room: "212" },
];
