
// Uses native fetch and FormData (Node 18+)

async function reproduce() {
  try {
    const loginResponse = await fetch('http://localhost:10000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: '055', password: '055' })
    });

    const cookie = loginResponse.headers.get('set-cookie');
    console.log('Login Status:', loginResponse.status);
    console.log('Cookie:', cookie);

    if (!cookie) {
        console.error("Login failed or no cookie returned");
        return;
    }

    const form = new FormData();
    form.append('content', 'Test update content from script');
    form.append('category', 'general');
    form.append('priority', 'normal');
    form.append('isUrgent', 'false');

    console.log('Sending request to http://localhost:10000/api/updates...');
    // @ts-ignore
    const response = await fetch('http://localhost:10000/api/updates', {
      method: 'POST',
      body: form,
      headers: {
        'Cookie': cookie,
        // Native fetch with FormData automatically sets Content-Type with boundary
      }
    });

    console.log('Status:', response.status);
    const text = await response.text();
    console.log('Body:', text);

  } catch (error) {
    console.error('Error:', error);
  }
}

reproduce();

reproduce();
