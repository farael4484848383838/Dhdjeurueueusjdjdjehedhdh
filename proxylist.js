const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

// URL сайта с прокси
const proxyUrl = 'https://www.freeproxylists.net/';

// Функция для получения прокси с сайта
async function fetchProxies() {
  try {
    const response = await axios.get(proxyUrl);
    const $ = cheerio.load(response.data);

    let proxies = [];

    // Извлекаем все строки из таблицы
    $('table.DataGrid tr').each((i, row) => {
      const columns = $(row).find('td');
      if (columns.length > 1) {
        const ip = $(columns[0]).text().trim();
        const port = $(columns[1]).text().trim();
        if (ip && port) {
          proxies.push(`${ip}:${port}`);
        }
      }
    });

    // Убираем дубли
    proxies = [...new Set(proxies)];

    // Записываем прокси в файл
    fs.writeFileSync('proxies.txt', proxies.join('\n'), 'utf8');
    console.log('Прокси успешно записаны в файл proxies.txt');
  } catch (error) {
    console.error('Ошибка при получении прокси:', error);
  }
}

// Запуск функции
fetchProxies();
