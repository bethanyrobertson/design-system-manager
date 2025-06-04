# Deployed app: (https://design-system-manager-production-afd0.up.railway.app/)
## Email: admin@example.com
## Password: admin123

<img width="973" alt="Screenshot 2025-06-03 at 10 19 12 PM" src="https://github.com/user-attachments/assets/70832988-ff8d-4e6f-9d38-36eb60981368" />

** **File Structure** **<br/>
design-system-api/<br/>
│── middleware/<br/>
│       └── app.js<br/>
│── public/<br/>
│       └── index.html<br/>
│── models/<br/>
│       └── DesignToken.js<br/>
│       └── User.js<br/>
│── routes/<br/>
│       └── auth.js<br/>
│       └── tokens.js<br/>
│── tests/<br/>
│       └── auth.test.js<br/>
│       └── middleware.test.js<br/>
│       └── tokens.test.js <br/>
├── .env<br/>           
├── .gitignore<br/>      
├── package.json<br/>  
└── server.js<br/> 


** **Key Workflows** **
Token Management:
Admin can create/edit/delete tokens
Non-admin users can view tokens

** **Authentication Flow** **
User logs in/registers
JWT token is generated
Role-based permissions are checked

** **Search & Filter** **
Frontend: Real-time filtering of displayed tokens
Backend: MongoDB text search 
Filter by category

** **Data Import/Export** **
JSON file upload with validation
Export current tokens to JSON

** **Core Routes** **
Token API Endpoints
GET /api/tokens (list tokens with filtering)
GET /api/tokens/:id (get single token)
POST /api/tokens (create token)
PUT /api/tokens/:id (update token)
DELETE /api/tokens/:id (delete token)
POST /api/tokens/upload (bulk upload)


https://github.com/user-attachments/assets/3cc80af7-f3e2-482a-baa0-5982fa49215f




## 1. A description of the scenario your project is operating in.<br/>

I am building a design system API in JavaScript using Node.js and Express that serves as a centralized, programmable interface for design tokens and components. This system operates in an environment where development teams need consistent design implementation across multiple digital products and platforms. The API enables real-time access to design tokens (colors, typography, spacing, etc.), allowing both designers and developers to maintain a single source of truth while working with different technologies. By providing programmatic access to design assets, the system bridges the gap between design specifications and actual implementation code, ensuring visual consistency and reducing development time across web applications, mobile interfaces, and other digital touchpoints within the organization.


## 2. A description of what problem your project seeks to solve.<br/>

Traditional static design systems often suffer from a disconnection between design artifacts and implementation code, leading to drift between design and development. Without a programmatic API approach, design systems become difficult to maintain, slow to update, and inconsistently implemented across products. This results in fragmented user experiences, increased development time, redundant work, and technical debt. The core problem is the need for a single source of truth that can be consumed by different platforms and frameworks, allowing design tokens, components, and patterns to be dynamically updated while maintaining version control and backward compatibility.
