async function test() {
  try {
    const loginRes = await fetch('http://localhost:8080/api/auth/login', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({email: 'admin@trainee.com', password: 'admin'}) // guess
    });
    const data = await loginRes.json();
    const token = data.token;
    console.log("Token:", token.substring(0,20) + "...");

    const feedRes = await fetch('http://localhost:8080/api/feedback', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Feedback Data Text:", await feedRes.text());
  } catch(e) {
    console.error("Error:", e);
  }
}
test();
