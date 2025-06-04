# Design Token Manager
# Deployed app: (https://design-system-manager-production-afd0.up.railway.app/)
## Email: admin@example.com
## Password: admin123
-----
<img width="973" alt="Screenshot 2025-06-03 at 10 19 12 PM" src="https://github.com/user-attachments/assets/70832988-ff8d-4e6f-9d38-36eb60981368" />

## Reflection<br/>

### What Went Well <br/>
Authentication & Authorization:<br/>
• We covered this a lot in class<br/>

Deployment & Storage<br/>
• Deploying via Railway was intuitive and the logs were really helpful in debugging<br/>
• MongoDB setup and connection

### What Didn't Go Well<br/>
Error Handling:<br/>
• Inconsistent error response formats across different routes<br/>
• Some error messages could be more descriptive<br/>
• Missing validation for some input fields (e.g., email format)<br/>

Code Organization:<br/>
• Duplicate JWT secret key definition across files<br/>
• Some routes have too many responsibilities (e.g., token upload route)<br/>


### What I Learned<br/>
• Connecting front end to back end
• Database Management with MongoDB


-----
## Documentation<br/>

design-system-manager/
├── public/              # Static files
├── routes/             # API routes
├── models/             # Database models
├── middleware/         # Custom middleware
├── tests/              # Test files
└── server.js          # Main application file


** **Key Workflows** **<br/>
Token Management:<br/>
Admin can create/edit/delete tokens<br/>
Non-admin users can view tokens<br/>

** **Authentication Flow** **<br/>
User logs in/registers<br/>
JWT token is generated<br/>
Role-based permissions are checked<br/>

** **Search & Filter** **<br/>
Frontend: Real-time filtering of displayed tokens<br/>
Backend: MongoDB text search<br/>
Filter by category<br/>

** **Data Import/Export** **<br/>
JSON file upload with validation<br/>
Export current tokens to JSON<br/>

** **Core Routes** **<br/>
Token API Endpoints<br/>
GET /api/tokens (list tokens with filtering)<br/>
GET /api/tokens/:id (get single token)<br/>
POST /api/tokens (create token)<br/>
PUT /api/tokens/:id (update token)<br/>
DELETE /api/tokens/:id (delete token)<br/>
POST /api/tokens/upload (bulk upload)<br/>

** **GET /api/tokens:** **<br/>
• Category filtering<br/>
• Text search<br/>
• Sorting<br/>
• Authentication required<br/>
** **GET /api/tokens/:id:** **<br/>
• ID validation<br/>
• Token existence check<br/>
• Authentication required<br/>
** **POST /api/tokens:** **<br/>
• Admin role required<br/>
• Required field validation<br/>
• Duplicate name check<br/>
• Authentication required<br/>
** **PUT /api/tokens/:id:** **<br/>
• Creator or admin access<br/>
• ID validation<br/>
• Token existence check<br/>
• Authentication required<br/>
** **DELETE /api/tokens/:id:** **<br/>
• Admin role required<br/>
• ID validation<br/>
• Token existence check<br/>
• Authentication required<br/>
** **POST /api/tokens/upload:** **<br/>
• Admin role required<br/>
• JSON validation<br/>
• Duplicate handling<br/>
• Authentication required<br/>

-----
# A look at uploading a JSON and editing a token:<br/>

https://github.com/user-attachments/assets/3cc80af7-f3e2-482a-baa0-5982fa49215f


https://github.com/user-attachments/assets/55aa8a9f-6bae-4712-99e5-88fee92f1bdf


<img width="1330" alt="Screenshot 2025-06-03 at 6 03 50 PM" src="https://github.com/user-attachments/assets/b77251ed-79fc-43a2-8723-e0c109f2b9b0" />

-----
## 1. A description of the scenario your project is operating in.<br/>

I am building a design system API in JavaScript using Node.js and Express that serves as a centralized, programmable interface for design tokens and components. This system operates in an environment where development teams need consistent design implementation across multiple digital products and platforms. The API enables real-time access to design tokens (colors, typography, spacing, etc.), allowing both designers and developers to maintain a single source of truth while working with different technologies. By providing programmatic access to design assets, the system bridges the gap between design specifications and actual implementation code, ensuring visual consistency and reducing development time across web applications, mobile interfaces, and other digital touchpoints within the organization.


## 2. A description of what problem your project seeks to solve.<br/>

Traditional static design systems often suffer from a disconnection between design artifacts and implementation code, leading to drift between design and development. Without a programmatic API approach, design systems become difficult to maintain, slow to update, and inconsistently implemented across products. This results in fragmented user experiences, increased development time, redundant work, and technical debt. The core problem is the need for a single source of truth that can be consumed by different platforms and frameworks, allowing design tokens, components, and patterns to be dynamically updated while maintaining version control and backward compatibility.
