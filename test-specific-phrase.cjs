const axios = require("axios");

async function loginAndGetCookies() {
  const loginResponse = await axios.post(
    "http://localhost:10000/api/auth/login",
    {
      username: "farhanisthis",
      password: "123456",
    }
  );

  return loginResponse.headers["set-cookie"];
}

async function testSpecificPhrase() {
  try {
    console.log("Logging in...");
    const cookies = await loginAndGetCookies();

    const tests = [
      "submit this assignment on wednesday",
      "submit it before coming wednesday",
      "homework due this friday",
      "complete project by next monday",
    ];

    for (const test of tests) {
      console.log(`\n--- Testing: "${test}" ---`);

      const response = await axios.post(
        "http://localhost:10000/api/updates",
        {
          content: test,
        },
        {
          headers: {
            Cookie: cookies.join("; "),
          },
        }
      );

      console.log("Response data:");
      console.log("- ID:", response.data.id);
      console.log("- Title:", response.data.title);
      console.log("- Content:", response.data.content);
      console.log("- Category:", response.data.category);
      console.log("- Tags:", response.data.tags);
      console.log("- IsUrgent:", response.data.isUrgent);
      console.log("- DueDate:", response.data.dueDate);
      console.log("- DeadlineDate:", response.data.deadlineDate);

      if (response.data.deadlineDate || response.data.dueDate) {
        console.log("✅ Date detected successfully!");
      } else {
        console.log("❌ No date detected");
      }
    }
  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
  }
}

testSpecificPhrase();
