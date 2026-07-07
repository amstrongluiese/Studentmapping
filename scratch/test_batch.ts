async function run() {
  try {
    const startRes = await fetch("http://localhost:5000/api/imports/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ totalRecords: 1 })
    });
    console.log("Start res:", await startRes.text());

    const batchRes = await fetch("http://localhost:5000/api/imports/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ records: [{
        studentNumber: "123",
        fullName: "Test",
        previousSchool: "Test School",
        strand: "Test Strand",
        program: "Test Program",
        scholarship: "None",
        municipality: "Test",
        importSource: "Script"
      }] })
    });
    console.log("Batch res:", await batchRes.text());
  } catch (e) {
    console.error(e);
  }
}
run();
