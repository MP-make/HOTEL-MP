const http = require('http');

const data = JSON.stringify({
    id_usuario: 1,
    id_habitacion: 1,
    fecha_checkin: '2025-10-15T11:11:00',
    fecha_checkout: '2025-10-16T10:00:00'
});

const options = {
    hostname: 'localhost',
    port: 4000,
    path: '/api/cliente/reservas',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        console.log('\n=== RESULTADO DE LA PRUEBA ===\n');
        console.log('Status:', res.statusCode);
        
        if (res.statusCode === 201) {
            const json = JSON.parse(body);
            console.log('ID Reserva:', json.id_reserva);
            console.log('Check-in recibido:', json.fecha_checkin);
            console.log('Check-out recibido:', json.fecha_checkout);
            
            const match = json.fecha_checkin.match(/(\d{2}):(\d{2})/);
            if (match) {
                const hora = match[1] + ':' + match[2];
                console.log('\n--- VERIFICACION ---');
                console.log('Hora enviada: 11:11');
                console.log('Hora recibida:', hora);
                
                if (hora === '11:11') {
                    console.log('\n✅✅✅ EXITO! El timezone funciona correctamente');
                } else {
                    console.log('\n❌ ERROR: Se recibio', hora, 'en lugar de 11:11');
                }
            }
        } else {
            console.log('Error:', body);
        }
    });
});

req.on('error', (e) => console.error('Error:', e.message));
req.write(data);
req.end();
