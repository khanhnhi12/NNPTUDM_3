// ===== API (getAll) =====
const PRODUCTS_API = "https://api.escuelajs.co/api/v1/products";

async function getAllProducts() {
  const res = await fetch(PRODUCTS_API);
  if (!res.ok) throw new Error(`GET /products failed: ${res.status}`);
  return await res.json();
}

// ===== State =====
let allRows = [];
let search = "";
let pageSize = 5;
let page = 1;
let sortKey = null;
let sortDir = "asc";
let renderTimeout = null; // Biến dùng cho Debounce

// ===== Helpers =====
function normalize(s) {
  return (s || "").toString().toLowerCase().trim();
}

// Hàm Debounce: Chờ người dùng dừng gõ 300ms mới chạy lệnh
function debounceRender() {
  if (renderTimeout) clearTimeout(renderTimeout);
  renderTimeout = setTimeout(() => {
    page = 1; // Reset về trang 1 khi search
    render();
  }, 300);
}

function applyQuerySort(rows) {
  const q = normalize(search);
  let out = q ? rows.filter((p) => normalize(p.title).includes(q)) : rows;

  if (sortKey) {
    out = [...out].sort((a, b) => {
      if (sortKey === "title") {
        const va = normalize(a.title);
        const vb = normalize(b.title);
        if (va < vb) return sortDir === "asc" ? -1 : 1;
        if (va > vb) return sortDir === "asc" ? 1 : -1;
        return 0;
      }
      const va = Number(a.price ?? 0);
      const vb = Number(b.price ?? 0);
      return sortDir === "asc" ? va - vb : vb - va;
    });
  }
  return out;
}

function getPageSlice(rows) {
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  // Đảm bảo page không vượt quá totalPages (xử lý khi filter làm giảm số trang)
  if (page > totalPages) page = 1;

  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  return {
    totalPages,
    slice: rows.slice(start, end),
    total: rows.length,
  };
}

function render() {
  const tbody = document.getElementById("tbody");
  const meta = document.getElementById("meta");
  const pageInfo = document.getElementById("pageInfo");
  const prev = document.getElementById("prev");
  const next = document.getElementById("next");

  const filteredSorted = applyQuerySort(allRows);
  const { totalPages, slice, total } = getPageSlice(filteredSorted);

  meta.textContent = `Tổng: ${total} sản phẩm`;
  pageInfo.textContent = `Trang ${page} / ${totalPages}`;

  prev.disabled = page <= 1;
  next.disabled = page >= totalPages;

  // FIX QUAN TRỌNG: Sửa lỗi onerror loop và dùng ảnh placeholder
  tbody.innerHTML = slice
    .map((p) => {
      const img = p.images && p.images[0] ? p.images[0] : "";
      const catName = (p.category && p.category.name) || "";

      // Ảnh giữ chỗ trong suốt base64 để nhẹ trình duyệt nếu không có ảnh
      const placeholder = "https://placehold.co/120x90?text=No+Image";

      return `
              <tr>
                <td>${p.id ?? ""}</td>
                <td class="cell-img">
                  <img src="${img}" 
                       alt="${(p.title || "").replaceAll('"', "&quot;")}"
                       loading="lazy"
                       onerror="this.onerror=null; this.src='${placeholder}';" 
                  />
                </td>
                <td>${p.title ?? ""}</td>
                <td>${p.price ?? ""}</td>
                <td>${catName}</td>
              </tr>
            `;
    })
    .join("");

  const sortPriceBtn = document.getElementById("sortPrice");
  const sortTitleBtn = document.getElementById("sortTitle");

  sortPriceBtn.classList.toggle("active", sortKey === "price");
  sortTitleBtn.classList.toggle("active", sortKey === "title");

  sortPriceBtn.textContent =
    sortKey === "price"
      ? `Sắp xếp giá (${sortDir === "asc" ? "tăng" : "giảm"})`
      : "Sắp xếp giá";

  sortTitleBtn.textContent =
    sortKey === "title"
      ? `Sắp xếp tên (${sortDir === "asc" ? "A→Z" : "Z→A"})`
      : "Sắp xếp tên";
}

function toggleSort(key) {
  if (sortKey === key) {
    sortDir = sortDir === "asc" ? "desc" : "asc";
  } else {
    sortKey = key;
    sortDir = "asc";
  }
  page = 1;
  render();
}

// ===== Events =====

// SỬA: Dùng debounce thay vì gọi render trực tiếp
document.getElementById("search").addEventListener("input", (e) => {
  search = e.target.value;
  debounceRender();
});

document.getElementById("pageSize").addEventListener("change", (e) => {
  pageSize = Number(e.target.value);
  page = 1;
  render();
});

document
  .getElementById("sortPrice")
  .addEventListener("click", () => toggleSort("price"));
document
  .getElementById("sortTitle")
  .addEventListener("click", () => toggleSort("title"));

document.getElementById("prev").addEventListener("click", () => {
  if (page > 1) {
    page--;
    render();
  }
});

document.getElementById("next").addEventListener("click", () => {
  // Cần check lại length thật để tránh next quá đà (dù button đã disable)
  page++;
  render();
});

// ===== Init =====
(async () => {
  try {
    allRows = await getAllProducts();
    render();
  } catch (err) {
    document.getElementById("meta").textContent =
      "Lỗi tải dữ liệu: " + err.message;
    console.error(err);
  }
})();
