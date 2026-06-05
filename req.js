fetch('http://localhost:3000/api/admin/checkpoints/stats', {headers:{cookie:'next-auth.session-token='}}).then(r=>r.text()).then(console.log)
