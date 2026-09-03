const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

// 1. Data Sheet (Sample Member Data)
const memberData = [
    {
        "first_name": "Juan",
        "middle_name": "Dalisay",
        "last_name": "Dela Cruz",
        "gender": "Male",
        "dob": "1985-06-15",
        "contact_number": "+63 917 123 4567",
        "address": "Barangay 1, Manila, Philippines",
        "marital_status": "Married",
        "occupation": "Software Engineer",
        "education": "College Graduate",
        "status": "Active",
        "role": "Member",
        "join_date": "2020-01-10"
    },
    {
        "first_name": "Maria",
        "middle_name": "Santos",
        "last_name": "Reyes",
        "gender": "Female",
        "dob": "1990-03-22",
        "contact_number": "+63 918 987 6543",
        "address": "Kahului, Maui, Hawaii",
        "marital_status": "Single",
        "occupation": "Teacher",
        "education": "Master's Degree",
        "status": "Active",
        "role": "Secretary",
        "join_date": "2021-05-15"
    }
];

const memberWs = XLSX.utils.json_to_sheet(memberData, {
    header: [
        "first_name",
        "middle_name",
        "last_name",
        "gender",
        "dob",
        "contact_number",
        "address",
        "marital_status",
        "occupation",
        "education",
        "status",
        "role",
        "join_date"
    ]
});

// Set Column Widths for readability
memberWs["!cols"] = [
    { wch: 15 }, // first_name
    { wch: 15 }, // middle_name
    { wch: 18 }, // last_name
    { wch: 10 }, // gender
    { wch: 14 }, // dob
    { wch: 18 }, // contact_number
    { wch: 32 }, // address
    { wch: 15 }, // marital_status
    { wch: 20 }, // occupation
    { wch: 18 }, // education
    { wch: 12 }, // status
    { wch: 12 }, // role
    { wch: 14 }  // join_date
];

// 2. Instructions Sheet
const instructionsData = [
    { "Column Header": "first_name", "Required": "YES", "Description": "Member's given first name." },
    { "Column Header": "middle_name", "Required": "NO", "Description": "Member's middle name or middle initial." },
    { "Column Header": "last_name", "Required": "YES", "Description": "Member's family surname." },
    { "Column Header": "gender", "Required": "NO", "Description": "Must be 'Male' or 'Female'." },
    { "Column Header": "dob", "Required": "NO", "Description": "Date of Birth formatted as YYYY-MM-DD (e.g., 1985-06-15)." },
    { "Column Header": "contact_number", "Required": "NO", "Description": "Mobile or landline telephone number." },
    { "Column Header": "address", "Required": "NO", "Description": "Full home address." },
    { "Column Header": "marital_status", "Required": "NO", "Description": "'Single', 'Married', or 'Widowed'." },
    { "Column Header": "status", "Required": "NO", "Description": "'Active' or 'Inactive' (Defaults to Active)." },
    { "Column Header": "role", "Required": "NO", "Description": "'Member', 'Staff', 'Secretary', 'Treasurer', or 'Pastor'." },
    { "Column Header": "join_date", "Required": "NO", "Description": "Date joined formatted as YYYY-MM-DD." }
];

const instructionsWs = XLSX.utils.json_to_sheet(instructionsData);
instructionsWs["!cols"] = [
    { wch: 18 },
    { wch: 12 },
    { wch: 60 }
];

// 3. Create Workbook
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, memberWs, "Members Template");
XLSX.utils.book_append_sheet(wb, instructionsWs, "Instructions & Guide");

// Ensure directories exist
const dirs = [
    path.join(__dirname, "../Dashboard/downloads"),
    path.join(__dirname, "../public/downloads")
];

dirs.forEach(d => {
    if (!fs.existsSync(d)) {
        fs.mkdirSync(d, { recursive: true });
    }
    const targetFile = path.join(d, "CFMMS_Member_Import_Template.xlsx");
    XLSX.writeFile(wb, targetFile);
    console.log("✅ Member Template generated at:", targetFile);
});
