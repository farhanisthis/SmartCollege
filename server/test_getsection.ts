// Test getSection function
function getSection(classStr: string): string | null {
  const match = classStr.match(/\b(E1|E2|M1|M2)\b/);
  return match ? match[1] : null;
}

const testCases = [
  "Computer Science - Semester 5 E1",
  "E1",
  "Computer Science E2",
  "M1 Students",
  "",
  null,
  undefined,
];

console.log("Testing getSection function:\n");
testCases.forEach((test) => {
  const result = getSection(test as string);
  console.log(`Input: "${test}"`);
  console.log(`Output: ${result}\n`);
});
