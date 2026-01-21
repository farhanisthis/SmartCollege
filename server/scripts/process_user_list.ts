
import fs from "fs";
import path from "path";

const rawInput = `
1. 224402023 - Shiven Sharma
2. 324402023 - SHIVAM VIJ
3. 424402023 - TANYA SINHA
4. 524402023 - Madhav Wadhwa
5. 624402023 - POSHIKA PAL
6. 724402023 - Ranveer Singh
7. 824402023 - Devang bisht
8. 924402023 - Vaibhav Kumar
9. 1024402023 - Kkavya Sahni
10. 1124402023 - DEEPALI JAIN
11. 1224402023 - HARSH MAGGO
12. 1324402023 - Vibhuti Panwar
13. 1424402023 - Aryan verma
14. 1524402023 - Jai Malik
15. 1624402023 - NIHARIKA SHARMA
16. 1724402023 - Siddharth Shrestha
17. 1824402023 - ARYAN THAKUR
18. 1924402023 - Aditya Kant Pathak
19. 2024402023 - Gursahib Singh
20. 2124402023 - brahmjot singh
21. 2224402023 - HARSHITA SALUJA
22. 2324402023 - Sanskriti Singhal
23. 2424402023 - SANDEEP KUMAR
24. 2524402023 - Vishnu Narayan Khanna
25. 2624402023 - VAJIPAYAJULA  ADITYA
26. 2724402023 - Akshita
27. 2824402023 - Mishti sehgal
28. 2924402023 - TWINKLE SHARMA
29. 3024402023 - DHRUV SHARMA
30. 3124402023 - Saif Siddiqui
31. 3224402023 - Aman kumar
32. 3324402023 - Muskan sharma
33. 3424402023 - Vansh Khatri
34. 3524402023 - Pansul Saxena
35. 3624402023 - Mayank Mayur
36. 3724402023 - Niyati Mittal
37. 3824402023 - Jiya Basra
38. 3924402023 - Aditya s bhandari
39. 4024402023 - Krish Aggarwal
40. 4124402023 - MOHIT KUMAR RAWAT
41. 4224402023 - Pavish Ahuja
42. 4324402023 - Sunveen Kaur
43. 4424402023 - Priyanshu Shekhar Singh
44. 4524402023 - Manas Sharma
45. 4624402023 - Muskan Thapa
46. 4724402023 - SHIVANI TIWARI
47. 4824402023 - Parth Malhotra
48. 4924402023 - Megha Chakraborty
49. 5024402023 - Aaryan Bhardwaj
50. 5124402023 - Manish Nainwal
51. 5224402023 - Nitin Kamia
52. 5324402023 - krishna goyal
53. 5424402023 - Ashish Luthra
54. 5524402023 - Farhan Ali
55. 5624402023 - Jashandeep singh
56. 5724402023 - Aditya Bhardwaj
57. 5824402023 - AKSHAT GULSATIYA
58. 5924402023 - Shreeyansh Srivastava
59. 6024402023 - priyanshu sharma
60. Mohammad Asad - 00124402023
`;

function processList() {
    const lines = rawInput.trim().split('\n');
    const students = [];

    for (const line of lines) {
        let cleanLine = line.trim();
        // Remove leading numbering (e.g., "1. ")
        cleanLine = cleanLine.replace(/^\d+\.\s*/, "").trim();

        if (!cleanLine) continue;

        let enrollment = "";
        let name = "";

        // Check for specific hyphenated format
        if (cleanLine.includes("-")) {
            const parts = cleanLine.split("-");
            if (parts.length >= 2) {
                // Try to determine which part is enrollment
                const p1 = parts[0].trim();
                const p2 = parts[1].trim();

                if (/^\d+$/.test(p1)) {
                    enrollment = p1;
                    name = p2;
                } else if (/^\d+$/.test(p2)) {
                    enrollment = p2;
                    name = p1;
                }
            }
        }
        
        // If simple parsing failed or structure is different (fallback regex)
        // Trying to find the large number block
        if (!enrollment) {
             const match = cleanLine.match(/(\d{8,})/);
             if (match) {
                 enrollment = match[0];
                 name = cleanLine.replace(enrollment, "").replace("-", "").trim();
             }
        }

        if (enrollment && name) {
            // Logic to add '0' if missing
            // User instruction: "jisme 0 startinf me nhi hai usme daldo"
            // We also want to standardize to 11 digits if possible, as most start with 0 or 00
            
            // Remove any existing non-digit chars just in case
            enrollment = enrollment.replace(/\D/g, "");

            // Heuristic: If it's 9 digits (e.g. 224402023), it needs 2 zeros to match 00224402023
            // If it's 10 digits (e.g. 1024402023), it needs 1 zero to match 01024402023
            // Assuming target is 11 digits
            
            if (enrollment.length < 11) {
                enrollment = enrollment.padStart(11, '0');
            }

            // Normalizing Case
            // name = name.toUpperCase(); // Optional, but let's keep original casing or Title Case

            students.push({
                name: name,
                enrollment: enrollment,
                email: `${name.toLowerCase().replace(/\s+/g, "")}@example.com` // Generate placeholder email
            });
        }
    }


    // Sort students by enrollment number
    students.sort((a, b) => {
        return a.enrollment.localeCompare(b.enrollment);
    });

    console.log(`Parsed ${students.length} students.`);

    
    // Save to extraction file
    const outputPath = path.resolve("extracted_students.json");
    fs.writeFileSync(outputPath, JSON.stringify(students, null, 2));
    console.log(`Saved to ${outputPath}`);
}

processList();
