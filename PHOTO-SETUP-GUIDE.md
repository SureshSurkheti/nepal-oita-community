# 📸 Nepal-Oita Community Website - Photo Setup Guide

## 🗂️ Folder Structure

Your project should look like this:

```
NEPAL-OITA-COMMUNITY/
├── index.html                 ← Main homepage file
├── css/
│   └── style.css              ← Custom styles (optional)
├── js/
│   └── main.js                ← Custom scripts (optional)
├── images/
│   ├── events/                ← Event photos folder
│   │   ├── event1.jpg         ← Holi Festival photo
│   │   ├── event2.jpg         ← Student Orientation photo
│   │   └── event3.jpg         ← Food Festival photo
│   ├── photos/                ← Gallery photos folder
│   │   ├── photo1.jpg         
│   │   ├── photo2.jpg
│   │   ├── photo3.jpg
│   │   └── photo4.jpg
│   ├── qr-code.jpg            ← Facebook QR code
│   └── nepal-oita-bg.jpg      ← Hero background (optional)
└── icons/                     ← Icon images (if needed)
```

---

## 📷 Step 1: Add Event Photos

### What you need:
- 3 photos for the upcoming events section
- Recommended size: 800x600px or similar aspect ratio
- Format: JPG or PNG

### Where to put them:
1. Create a folder: `images/events/`
2. Add your photos with these exact names:
   - `event1.jpg` → Holi Festival photo
   - `event2.jpg` → Student Orientation photo
   - `event3.jpg` → Food Festival photo

### 💡 Tips:
- Use bright, colorful photos that represent each event
- Make sure photos are well-lit and show people celebrating
- File size: Keep under 500KB for faster loading

---

## 🖼️ Step 2: Add Gallery Photos

### What you need:
- At least 4 photos from past community events
- Can add more by editing the code
- Recommended size: 800x800px (square format works best)

### Where to put them:
1. Use the existing folder: `images/photos/`
2. Name your photos: `photo1.jpg`, `photo2.jpg`, `photo3.jpg`, `photo4.jpg`, etc.

### 💡 Tips:
- Mix different types of events (festivals, gatherings, workshops)
- Show diversity in your community
- Capture genuine moments and emotions

---

## 📱 Step 3: Add QR Code

### What you need:
1. Go to your Facebook page
2. Generate a QR code (Facebook has built-in tools for this)
3. Download the QR code image

### Where to put it:
- Save as: `images/qr-code.jpg`

### Alternative:
Use an online QR code generator like:
- https://www.qr-code-generator.com/
- Enter your Facebook page URL
- Download and save as `qr-code.jpg`

---

## 🎨 Step 4: Add More Gallery Photos (Optional)

Want to add more than 4 photos? Here's how:

### In index.html, find this section:
```html
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
```

### Add more photo cards:
```html
<!-- Photo 5 -->
<div class="group relative overflow-hidden rounded-2xl shadow-lg cursor-pointer card-hover" onclick="openGallery(4)">
  <img src="images/photos/photo5.jpg" alt="Community Event" class="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-110">
  <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center">
    <i class="fas fa-search-plus text-white text-3xl opacity-0 group-hover:opacity-100 transition-opacity"></i>
  </div>
</div>
```

### Update the JavaScript array:
Find this line in the code:
```javascript
const galleryImages = [
  'images/photos/photo1.jpg',
  'images/photos/photo2.jpg',
  'images/photos/photo3.jpg',
  'images/photos/photo4.jpg'
];
```

Add your new photos:
```javascript
const galleryImages = [
  'images/photos/photo1.jpg',
  'images/photos/photo2.jpg',
  'images/photos/photo3.jpg',
  'images/photos/photo4.jpg',
  'images/photos/photo5.jpg',  // New photo
  'images/photos/photo6.jpg'   // New photo
];
```

---

## ✏️ Step 5: Edit Event Details

### To change event information:
In `index.html`, find the `eventDetails` object in the JavaScript section:

```javascript
const eventDetails = {
  1: {
    title: "Holi Festival Celebration 🎨",
    date: "March 15, 2026",
    time: "10:00 AM - 4:00 PM",
    // ... edit any information here
  }
};
```

### You can change:
- Event titles
- Dates and times
- Locations
- Descriptions
- Event details/highlights
- Registration fees
- Contact information

---

## 🎯 Step 6: How "Learn More" Works

### When visitors click "Learn More":
1. A beautiful modal popup appears
2. Shows full event details
3. Displays all event highlights
4. Shows registration information
5. Has a "Register Now" button that scrolls to contact form

### Features:
- ✅ Click anywhere outside modal to close
- ✅ Press ESC key to close
- ✅ Click X button to close
- ✅ Mobile-friendly responsive design

---

## 🖼️ Step 7: How Photo Gallery Works

### Gallery Features:
1. **Grid View**: Shows 4 photos in a responsive grid
2. **Click to Enlarge**: Click any photo to open full-screen view
3. **Navigation**: 
   - Click left/right arrows to browse
   - Use keyboard arrows (←/→)
   - Press ESC to close
4. **Hover Effects**: Photos zoom slightly on hover

---

## 🚀 Step 8: Testing Your Website

### Before going live, test:

1. ✅ All images load correctly
2. ✅ "Learn More" buttons open event details
3. ✅ Gallery photos open in full screen
4. ✅ QR code displays properly
5. ✅ Mobile view looks good
6. ✅ All navigation links work

### How to test:
1. Open `index.html` in your web browser
2. Click through all sections
3. Test on different devices (phone, tablet, desktop)
4. Test on different browsers (Chrome, Firefox, Safari)

---

## 🔧 Troubleshooting

### Photos not showing?
1. Check file names match exactly (case-sensitive!)
2. Make sure photos are in correct folders
3. Check file extensions (.jpg not .jpeg)
4. Verify image paths in code

### "Learn More" not working?
1. Check browser console for errors (F12)
2. Make sure JavaScript is enabled
3. Clear browser cache and reload

### Gallery not opening?
1. Check that galleryImages array has correct paths
2. Verify onclick handlers are present
3. Test in different browser

---

## 📝 Quick Checklist

Before launching your website:

- [ ] All 3 event photos added to `images/events/`
- [ ] At least 4 gallery photos added to `images/photos/`
- [ ] QR code added as `images/qr-code.jpg`
- [ ] Event details updated with correct information
- [ ] Contact information verified (email, phone)
- [ ] Tested on mobile devices
- [ ] Tested on desktop browsers
- [ ] All "Learn More" buttons work
- [ ] Gallery opens and navigates correctly
- [ ] Social media links updated

---

## 🎨 Customization Tips

### Want to change colors?
Edit the CSS variables at the top of `<style>` section:
```css
:root {
  --primary-green: #1e7e34;
  --primary-red: #dc143c;
  --primary-blue: #003893;
}
```

### Want to add more events?
1. Add event card HTML in the events section
2. Add event details to the `eventDetails` object
3. Update the onclick handler with new event ID

### Want different number of gallery columns?
Change `lg:grid-cols-4` to:
- `lg:grid-cols-3` for 3 columns
- `lg:grid-cols-5` for 5 columns
- `lg:grid-cols-6` for 6 columns

---

## 🌐 Going Live

### Option 1: Free Hosting
- **Netlify**: Drag and drop your folder
- **GitHub Pages**: Push to GitHub repository
- **Vercel**: Connect your Git repository

### Option 2: Paid Hosting
- Purchase domain name (example.com)
- Get web hosting service
- Upload files via FTP or control panel

---

## 📞 Need Help?

Common questions:

**Q: Can I use different image formats?**
A: Yes! JPG, PNG, and WebP all work. Just update the file extensions in the code.

**Q: How many photos can I add to the gallery?**
A: Unlimited! Just keep adding photos and updating the array.

**Q: Can I change the event modal design?**
A: Yes! Edit the modal HTML in the `showEventDetails()` function.

**Q: How do I add more events?**
A: Copy an existing event card, change the onclick to a new ID, and add details to eventDetails object.

---

## 🎉 You're Ready!

Your Nepal-Oita Community website is now fully functional with:
- ✅ Beautiful event cards with real photos
- ✅ Interactive "Learn More" modals
- ✅ Photo gallery with full-screen view
- ✅ QR code for easy Facebook follow
- ✅ Mobile-responsive design
- ✅ Smooth animations and transitions

**Good luck with your community website! 🇳🇵🤝🇯🇵**
