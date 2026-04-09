const container = document.getElementById('stats');

container.innerHTML = `
  <p>إجمالي الطلبات: ${stats.total}</p>
  <p>المفتوحة: ${stats.open}</p>
  <p>المغلقة: ${stats.closed}</p>
`;
