const axios = require("axios");

async function testDeadlineResponse() {
  try {
    // Login first
    const loginResponse = await axios.post(
      "http://localhost:10000/api/auth/login",
      {
        username: "farhanisthis",
        password: "123456",
      }
    );

    const cookies = loginResponse.headers["set-cookie"];

    // Create a test update
    const response = await axios.post(
      "http://localhost:10000/api/updates",
      {
        content: "VERIFY_DEADLINE_homework_due_friday",
      },
      {
        headers: {
          Cookie: cookies.join("; "),
        },
      }
    );

    console.log("Update created:");
    console.log("- ID:", response.data.id);
    console.log("- Title:", response.data.title);
    console.log("- Category:", response.data.category);
    console.log("- IsUrgent:", response.data.isUrgent);
    console.log("- DueDate:", response.data.dueDate);
    console.log("- DeadlineDate:", response.data.deadlineDate);

    if (response.data.deadlineDate) {
      console.log("✅ DeadlineDate is now working!");
    } else {
      console.log("❌ DeadlineDate still not working");
    }
  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
  }
}

testDeadlineResponse();
