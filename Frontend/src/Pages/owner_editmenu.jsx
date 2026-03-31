import { BASE_URL } from '../config';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, ChevronDown, Plus, Edit3, AlertTriangle, X, Trash2 } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

export default function OwnerEditMenu() {
  const { showAlert, showConfirm } = useNotifications();
  // ==========================================
  // 1. MASTER DATA STATE & AUTH
  // ==========================================
  // 🚨 Starts empty because we will fetch real data from MongoDB!
  const [menuItems, setMenuItems] = useState([]);

  const canteenId = sessionStorage.getItem('canteenId'); // Saved from dashboard!
  const token = sessionStorage.getItem('token');
  // ==========================================
  // 2. INTERACTION STATE (Modals & Filters)
  // ==========================================
  // State variables for manipulating UI filters, search texts, and dynamic sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeSort, setActiveSort] = useState('');

  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  // Edit Modal State
  const [itemToEdit, setItemToEdit] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');

  // ==========================================
  // 3. API FETCH (On Page Load)
  // ==========================================
  // Pull current canteen details to retrieve the owner's assigned menu catalog
  useEffect(() => {
    const fetchCanteenAndMenu = async () => {
      try {
        let currentCanteenId = sessionStorage.getItem('canteenId');

        // 🏆 FIXED: If user jumped straight to edit menu, fetch their Canteen ID securely!
        if (!currentCanteenId) {
          const canteenRes = await axios.get(`${BASE_URL}/api/canteens/my`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          currentCanteenId = canteenRes.data.data.canteen._id;
          sessionStorage.setItem('canteenId', currentCanteenId);
        }

        // Now fetch the actual menu items using the real Canteen ID
        const res = await axios.get(`${BASE_URL}/api/canteens/${currentCanteenId}/menu`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        setMenuItems(res.data.data.menu.map(item => ({ ...item, id: item._id })));
      } catch (err) {
        console.error("Failed to load menu or canteen data...", err);
      }
    };

    if (token) fetchCanteenAndMenu();
  }, [token]);

  // ==========================================
  // 4. HANDLERS (Integrated with Backend)
  // ==========================================

  // Flip the active status of an item and instantly update the server database
  // --- TOGGLE AVAILABILITY ---
  const toggleAvailability = async (id) => {
    const item = menuItems.find(i => i.id === id);
    if (!item) return;

    try {
      await axios.put(`${BASE_URL}/api/canteens/menu/${id}`,
        { isAvailable: !item.isAvailable },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Update UI only if DB call succeeds
      setMenuItems(menuItems.map(i =>
        i.id === id ? { ...i, isAvailable: !i.isAvailable } : i
      ));
    } catch (err) {
      console.error("Error toggling availability:", err);
    }
  };

  // --- ADD ITEM LOGIC ---
  const handleOpenAddModal = () => {
    setNewName('');
    setNewPrice('');
    setIsAddModalOpen(true);
  };

  const handleConfirmAdd = async () => {
  if (!newName.trim() || !newPrice.trim() || isNaN(newPrice) || parseFloat(newPrice) < 0) {
    showAlert("Invalid Input", "Please enter a valid Name and Price.", "warning");
    return;
  }

  // 🏆 FETCH FRESH ID RIGHT BEFORE SENDING
  const activeCanteenId = sessionStorage.getItem('canteenId');

  if (!activeCanteenId) {
    showAlert("Error", "Canteen ID not found. Please refresh the page.", "error");
    return;
  }

  try {
    const res = await axios.post(`${BASE_URL}/api/canteens/${activeCanteenId}/menu`,
      { 
        name: newName, 
        price: parseFloat(newPrice), 
        isAvailable: true,
        canteenId: activeCanteenId // Ensure your backend receives this explicitly
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const newItem = res.data.data.menuItem;
    setMenuItems([{ ...newItem, id: newItem._id }, ...menuItems]);
    setIsAddModalOpen(false);
    setNewName('');
    setNewPrice('');
    showAlert("Success", `${newName} has been added to the menu!`, "success");
  } catch (err) {
    console.error("Error adding item:", err);
    showAlert("Error", "Failed to add item to menu.", "error");
  }
};

  // --- EDIT ITEM LOGIC ---
  const handleEditClick = (item) => {
    setItemToEdit(item);
    setEditName(item.name);
    setEditPrice(item.price.toString());
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    // 1. Validate Input First!
    if (!editName.trim() || !editPrice.trim() || isNaN(editPrice) || parseFloat(editPrice) < 0) {
      showAlert("Invalid Input", "Please enter a valid Name and Price.", "warning");
      return;
    }

    // 2. Send updates to Database
    try {
      const res = await axios.put(`${BASE_URL}/api/canteens/menu/${itemToEdit.id}`,
        { name: editName, price: parseFloat(editPrice) },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updatedItem = res.data.data.menuItem;

      // 3. Update UI and Close Modal
      setMenuItems(menuItems.map(item =>
        item.id === itemToEdit.id ? { ...updatedItem, id: updatedItem._id } : item
      ));
      setIsEditModalOpen(false);
      setItemToEdit(null);
      showAlert("Updated", "Item updated successfully.", "success");
    } catch (err) {
      console.error("Error saving edits:", err);
      showAlert("Error", "Failed to save edits to database", "error");
    }
  };

  // --- DELETE ITEM LOGIC ---
  const handleDeleteItem = (id) => {
    showConfirm(
      "Delete Item",
      "Are you sure you want to delete this item? This action cannot be undone.",
      async () => {
        try {
          await axios.delete(`${BASE_URL}/api/canteens/menu/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });

          // Remove from UI after DB confirms deletion
          setMenuItems(prev => prev.filter(item => item.id !== id));
          showAlert("Deleted", "The item has been removed from your menu.", "success");
        } catch (err) {
          console.error("Error deleting item:", err);
          showAlert("Error", "Failed to delete item from database", "error");
        }
      }
    );
  };

  // ==========================================
  // 5. DERIVED STATE (Filters & Sorting)
  // ==========================================
  let filteredAndSortedMenu = [...menuItems]
    .filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(item => {
      if (activeFilter === 'available') return item.isAvailable;
      if (activeFilter === 'unavailable') return !item.isAvailable;
      return true;
    })
    .sort((a, b) => {
      if (activeSort === 'price-low-high') return a.price - b.price;
      if (activeSort === 'price-high-low') return b.price - a.price;
      if (activeSort === 'name-a-z') return a.name.localeCompare(b.name);
      return 0;
    });

  const getFilterText = () => {
    if (activeFilter === 'available') return "Available Only";
    if (activeFilter === 'unavailable') return "Unavailable Only";
    return "Filter by";
  };

  const getSortText = () => {
    if (activeSort === 'price-low-high') return "Price Low → High";
    if (activeSort === 'price-high-low') return "Price High → Low";
    if (activeSort === 'name-a-z') return "Name A → Z";
    return "Sort by";
  };

  // ==========================================
  // 6. RENDER
  // ==========================================
  return (
    <>
      {/* 1. ADD NEW ITEM MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-white/70 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] w-[500px] p-10 relative border border-gray-100">
            <X onClick={() => setIsAddModalOpen(false)} className="absolute top-5 right-5 w-5 h-5 text-gray-600 cursor-pointer hover:text-black transition" />
            <h2 className="text-xl font-medium text-center text-gray-900 mb-10">Add New Item:</h2>
            <div className="space-y-8 mb-12 px-4">
              <div className="flex items-center justify-between">
                <label className="text-gray-900 font-medium text-lg">Item Name:</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-48 text-center border-b-2 border-gray-900 focus:border-[#eab308] outline-none pb-1 bg-transparent text-lg placeholder-gray-300"
                  placeholder="e.g. Cheese Dosa"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-gray-900 font-medium text-lg">Price:</label>
                <div className="w-48 flex items-center justify-center border-b-2 border-gray-900 focus-within:border-[#eab308] pb-1">
                  <span className="text-gray-900 text-lg mr-1">₹</span>
                  <input
                    type="number"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="w-16 text-center outline-none bg-transparent text-lg placeholder-gray-300"
                    placeholder="120"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-center gap-8">
              <button onClick={handleConfirmAdd} className="cursor-pointer px-8 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm text-gray-800 font-medium hover:bg-gray-50 transition text-lg">
                Confirm
              </button>
              <button onClick={() => setIsAddModalOpen(false)} className="cursor-pointer px-8 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm text-gray-800 font-medium hover:bg-gray-50 transition text-lg">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. EDIT ITEM MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-[400px] border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-900">Edit Item</h3>
              <X onClick={() => setIsEditModalOpen(false)} className="w-5 h-5 text-gray-400 cursor-pointer hover:text-red-500" />
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Food Item Name</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#eab308] focus:border-[#eab308] outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Price (₹)</label>
                <input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#eab308] focus:border-[#eab308] outline-none" />
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setIsEditModalOpen(false)} className="cursor-pointer px-5 py-2 rounded-lg font-semibold text-gray-700 hover:bg-gray-100 transition">Cancel</button>
              <button onClick={handleSaveEdit} className="cursor-pointer bg-[#1e293b] hover:bg-slate-800 text-white font-medium px-6 py-2 rounded-lg transition">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* 3. MAIN CONTENT PAGE */}
      <div className="p-8 pb-32">

        {/* TOP ROW: Search & Filters */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center bg-white px-4 py-2.5 rounded-full shadow-sm w-[500px] border border-gray-100">
            <Search className="w-5 h-5 text-gray-400 mr-2" />
            <input
              type="text"
              placeholder="Search for Item"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent outline-none w-full text-gray-700"
            />
          </div>

          <div className="flex gap-4">
            <div className="relative">
              <button onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)} className="cursor-pointer bg-[#eab308] hover:bg-yellow-500 text-[#1e293b] font-semibold px-6 py-2.5 rounded-lg shadow-sm flex items-center gap-2 transition min-w-[150px] justify-between">
                {getFilterText()} <ChevronDown className="w-4 h-4" />
              </button>
              {isFilterDropdownOpen && (
                <div className="absolute right-0 mt-3 w-48 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden">
                  <div onClick={() => { setActiveFilter('all'); setIsFilterDropdownOpen(false) }} className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-50 transition ${activeFilter === 'all' ? 'bg-yellow-50 font-semibold text-[#1e293b]' : 'text-gray-700'}`}>All Items</div>
                  <div onClick={() => { setActiveFilter('available'); setIsFilterDropdownOpen(false) }} className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-50 transition ${activeFilter === 'available' ? 'bg-yellow-50 font-semibold text-[#1e293b]' : 'text-gray-700'}`}>Available Only</div>
                  <div onClick={() => { setActiveFilter('unavailable'); setIsFilterDropdownOpen(false) }} className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-50 transition ${activeFilter === 'unavailable' ? 'bg-yellow-50 font-semibold text-[#1e293b]' : 'text-gray-700'}`}>Unavailable Only</div>
                </div>
              )}
            </div>

            <div className="relative">
              <button onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)} className="cursor-pointer bg-[#eab308] hover:bg-yellow-500 text-[#1e293b] font-semibold px-6 py-2.5 rounded-lg shadow-sm flex items-center gap-2 transition min-w-[150px] justify-between">
                {getSortText()} <ChevronDown className="w-4 h-4" />
              </button>
              {isSortDropdownOpen && (
                <div className="absolute right-0 mt-3 w-56 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden">
                  <div onClick={() => { setActiveSort('price-low-high'); setIsSortDropdownOpen(false) }} className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-50 transition ${activeSort === 'price-low-high' ? 'bg-yellow-50 font-semibold text-[#1e293b]' : 'text-gray-700'}`}>Price: Low to High</div>
                  <div onClick={() => { setActiveSort('price-high-low'); setIsSortDropdownOpen(false) }} className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-50 transition ${activeSort === 'price-high-low' ? 'bg-yellow-50 font-semibold text-[#1e293b]' : 'text-gray-700'}`}>Price: High to Low</div>
                  <div onClick={() => { setActiveSort('name-a-z'); setIsSortDropdownOpen(false) }} className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-50 transition ${activeSort === 'name-a-z' ? 'bg-yellow-50 font-semibold text-[#1e293b]' : 'text-gray-700'}`}>Name: A to Z</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* HEADER ROW: Title & Add Button */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-semibold text-gray-900">Manage Menu</h1>
          <button onClick={handleOpenAddModal} className="cursor-pointer bg-[#1e293b] hover:bg-slate-800 text-white font-medium px-6 py-3 rounded-lg shadow-md flex items-center gap-2 transition">
            <Plus className="w-5 h-5" /> Add New Item
          </button>
        </div>

        {/* DYNAMIC MENU GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
          {filteredAndSortedMenu.length === 0 && (
            <div className="col-span-1 md:col-span-2 bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center flex flex-col items-center justify-center gap-3">
              <AlertTriangle className="w-10 h-10 text-orange-400" />
              <p className="text-xl font-semibold text-gray-800">No matching items found!</p>
              <button onClick={() => { setSearchQuery(''); setActiveFilter('all'); setActiveSort(''); }} className="cursor-pointer mt-2 bg-[#eab308] hover:bg-yellow-500 text-[#1e293b] font-semibold px-5 py-2 rounded-lg transition text-sm">Clear All Filters</button>
            </div>
          )}

          {filteredAndSortedMenu.map((item) => (
            <div key={item.id} className={`bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex justify-between items-center transition hover:shadow-md ${!item.isAvailable ? 'opacity-60' : ''}`}>
              <div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">{item.name}</h3>
                <p className="text-sm text-gray-600">
                  Price: <span className="text-[#3b82f6] font-semibold">₹{item.price}</span>
                </p>
              </div>
              <div className="flex flex-col items-end gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-gray-500">Available</span>
                  <div
                    onClick={() => toggleAvailability(item.id)}
                    className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ease-in-out ${item.isAvailable ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${item.isAvailable ? 'translate-x-6' : 'translate-x-0'}`}></div>
                  </div>
                </div>

                {/* BUTTONS ROW: Edit and Delete */}
                <div className="flex items-center gap-2">
                  <button onClick={() => handleEditClick(item)} className="cursor-pointer flex items-center gap-1 text-sm font-semibold text-gray-600 border border-gray-200 bg-gray-50 hover:bg-gray-100 px-3 py-1 rounded-full transition">
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button onClick={() => handleDeleteItem(item.id)} className="cursor-pointer flex items-center gap-1 text-sm font-semibold text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-full transition">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>

              </div>
            </div>
          ))}
        </div>

        {(isFilterDropdownOpen || isSortDropdownOpen) && (
          <div onClick={() => { setIsFilterDropdownOpen(false); setIsSortDropdownOpen(false); }} className="fixed inset-0 z-40" />
        )}

      </div>
    </>
  );
}
