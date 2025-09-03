# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development Server
```bash
# Python 3 (recommended)
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000

# Node.js (if available)
npx serve

# Open browser at http://localhost:8000
```

### Git Operations
```bash
# Check status
git status

# Stage and commit changes
git add .
git commit -m "message"

# Push to GitHub
git push origin main
```

### Deployment
This is a static site that can be deployed to any web server:
- Upload all files to web server root
- Ensure HTTPS is configured (recommended for APIs)
- Verify CDN resources are accessible (zww2.xiexinbao.com)

## Architecture

### Technology Stack
- **Frontend**: Pure HTML5 + CSS3 + Vanilla JavaScript (ES6+)
- **Compression**: JSZip 3.x for client-side ZIP operations
- **External Libraries**: Loaded from zww2.xiexinbao.com CDN
  - zww_utils.js - Core utilities
  - custom-toast.js - Toast notifications
  - zww_uploader.js - File upload component
  - thumbmark.js - Device fingerprinting
  - page-components.js - Modular component system

### Project Structure
```
zip_h5/
├── index.html              # Entry point - file selection
├── file-manager.html       # File management and editing
├── result.html            # Compression result and download
└── zww/                   # New modular version (in development)
    ├── zip_index.html     # Refactored index with components
    ├── zip_item.html      # File management page
    ├── zip_result.html    # Result page
    └── js/
        └── page-components.js  # Component-based architecture
```

### Core Flow
1. **index.html**: Users select files → stored in sessionStorage
2. **file-manager.html**: Edit filenames, add/remove files → trigger compression
3. **result.html**: Download compressed ZIP → payment logic for large files

### Key Design Decisions

#### File Passing Between Pages
- Uses combination of sessionStorage and global variables
- Files stored as File objects, not serialized
- Suitable for files < 100MB due to browser memory limits

#### Component Architecture (zww directory)
- New modular system using PageComponents
- Each component is self-contained with CSS, HTML, and JS
- Components extend BaseComponent class
- Isolated styling using component-specific IDs

#### Payment Logic
- Files < 10MB: Free download
- Files > 10MB: Requires phone binding or VIP membership
- Integration with payment API at p.xiexinbao.com

#### Analytics Integration
- User behavior tracking via log.xiexinbao.com
- Device fingerprinting for user identification
- Performance monitoring and error tracking

### External Service Dependencies
- **CDN**: zww2.xiexinbao.com (critical - provides core libraries)
- **Analytics**: log.xiexinbao.com (non-critical)
- **Payment**: p.xiexinbao.com (required for large files)
- **Order API**: p.xiexinbao.com/zww_order/add

### Browser Compatibility
- Modern browsers with File API support
- Chrome 60+, Firefox 55+, Safari 12+, Edge 79+
- Mobile browsers fully supported

### Performance Considerations
- Client-side compression limited by browser memory (~2-4GB)
- Recommended file size limits: Single file < 100MB, Total < 500MB
- Compression runs in main thread (consider Web Workers for optimization)

## Development Guidelines

### When Adding Features
1. Check if feature exists in zww/ directory (newer modular version)
2. Use existing utilities from zww2.xiexinbao.com CDN
3. Follow component-based pattern if working in zww/ directory
4. Maintain mobile-first responsive design

### When Fixing Bugs
1. Test on both desktop and mobile browsers
2. Verify CDN resources are loading correctly
3. Check browser console for errors
4. Test file size edge cases (< 10MB and > 10MB)

### Code Style
- Use ES6+ features (const, let, arrow functions, template literals)
- Follow existing indentation (4 spaces)
- Keep mobile performance in mind
- Add meaningful comments for complex logic