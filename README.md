BREWHAUS Coffee Shop Management System
Module: BIWA2110 – Web Application Development
Project: Coffee Shop Management Web Application
Project type: Group assignment – Full-stack web development
1. Project Overview
The BREWHAUS Coffee Shop Management System is a full-stack web application designed to modernise coffee shop operations. It allows customers to browse menu items, add products to a shopping cart, place orders, and track order statuses. A staff dashboard supports product management, customer order processing, and the review of sales information.

The project brings together a React frontend, an Express.js REST API, and a Redis key-value NoSQL database. The group contribution report identifies GitHub for collaboration, Netlify for frontend hosting, and Render for backend hosting.
2. Objectives
- Provide a convenient online menu and ordering experience for customers.
- Support shopping cart and order placement functionality.
- Allow staff to manage menu products and process orders.
- Store and retrieve menu and order records using Redis.
- Connect the frontend and backend through the Fetch API.
- Support collaborative development, testing, documentation, and cloud deployment.
3. Technologies Used
Technology	Purpose
React.js	Customer interface and staff dashboard
Express.js / Node.js	REST API and server-side application logic
Fetch API	HTTP communication between frontend and backend
Redis	Key-value NoSQL storage for menu items and orders
GitHub	Source control and group collaboration
Netlify	Frontend hosting
Render	Backend hosting


4. Main Features
Customer Interface
- Browse available coffee shop menu items.
- View menu item details and prices.
- Add products to a shopping cart.
- Place customer orders.
- Track order statuses.
Staff Dashboard
- Add, edit, and delete menu products.
- Manage product information.
- View and process customer orders.
- Update order statuses.
- Review order summaries and sales information.
Data Management
- Store and retrieve menu and order records using Redis.
- Use unique identifiers for records.
- Support persistent storage when Redis persistence is correctly configured.
- Validate requests and handle errors in the backend.
Note: These features reflect the project description and group contribution report. Confirm that each feature works in the final deployed application before submission.

5. System Architecture
Customer / Staff
       |
       v
React.js Frontend (Netlify)
       |
       | Fetch API / HTTP requests
       v
Express.js REST API (Render)
       |
       v
Redis Key-Value NoSQL Database
       |
       v
Menu Records and Customer Orders
6. Project Structure
Coffee-Shop-Management/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   └── package.json
├── Server/                 # Express backend
│   ├── Config/
│   ├── middleware/
│   ├── routes/
│   ├── tests/
│   ├── utils/
│   ├── app.js
│   ├── server.js
│   └── package.json
├── docs/                   # Contribution and testing documentation
├── README.md
└── render.yaml             # Render deployment configuration
This structure follows the project folder shown during development. Adjust it if the final repository differs.
7. Installation and Local Setup
Prerequisites
- Node.js and npm
- A Redis database instance or managed Redis service
- Git
Clone the repository
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd Coffee-Shop-Management
Start the backend
Open a terminal in the project root:
cd Server
npm install
Create a .env file in Server/ based on Server/.env.example. Set the Redis connection URL and any other variables required by the backend. For example, only if these variable names match the implementation:
REDIS_URL=your_redis_connection_url
PORT=3000
CLIENT_ORIGIN=http://localhost:5173
Start the backend using the script defined in Server/package.json, typically:
npm run dev
If there is no dev script, check package.json and use the actual start script. Test the backend health endpoint at http://localhost:3000/api/health if the backend is configured for port 3000.
Start the frontend
Open a second terminal from the project root:
cd client
npm install
Create client/.env based on client/.env.example and set the backend API URL. For example, if the frontend uses this variable name:
VITE_API_URL=http://localhost:3000
Then run:
npm run dev
Open the local URL displayed by Vite (commonly http://localhost:5173).

Important: Never commit .env files or Redis credentials to GitHub. Confirm the exact environment variable names in the application code and .env.example files.
8. REST API Endpoints
The assignment specifies the following REST endpoints. Verify that the final backend exposes each route and uses the correct request and response formats.
Method	Endpoint	Purpose
GET	/api/health	Check backend availability
GET	/api/menu	Retrieve all menu items
GET	/api/menu/:id	Retrieve a menu item
POST	/api/menu	Add a menu item
PUT	/api/menu/:id	Update a menu item
DELETE	/api/menu/:id	Delete a menu item
GET	/api/orders	Retrieve customer orders
GET	/api/orders/:id	Retrieve a specific order
POST	/api/orders	Place an order
PATCH	/api/orders/:id/status	Update order status


Order statuses required by the assignment: Pending, Preparing, Ready, and Collected.

Staff-only endpoints must be protected with appropriate authentication and authorisation. Do not treat the presence of a route as proof that access controls are configured.
9. Redis Database
Redis is used as the key-value NoSQL database for menu items and customer orders. The assignment requires unique record identifiers and JSON-valued records. A persistent Redis service must be configured so that records survive backend restarts.

Before final submission, confirm that:
1. Menu items and orders are stored in Redis rather than temporary in-memory storage.
2. Each record has a unique ID.
3. Records remain available after restarting the backend.
4. Redis credentials are stored in backend environment variables, not committed to GitHub.
10. Testing
The group report assigns testing and documentation work to Mapotse Thebe. The final demonstration should verify:
- Customer menu retrieval and product display.
- Adding products to the cart and changing quantities.
- Placing an order and receiving a unique order number.
- Adding, editing, and deleting menu items through the staff dashboard.
- Updating an order from Pending to Preparing, Ready, and Collected.
- Viewing order totals and daily summaries.
- Backend error handling and staff access protection.
- Redis persistence after a server restart.
- Frontend/backend connectivity after deployment.
Record actual test results in docs/TESTING.md and include screenshots where required. Do not mark tests as passed until they have been run.
11. Deployment
Frontend – Netlify
Live website: [ADD NETLIFY FRONTEND URL]

Backend – Render
Live API: [ADD RENDER BACKEND URL]
Health check: [ADD RENDER BACKEND URL]/api/health

GitHub repository
[ADD GITHUB REPOSITORY URL]

Configure the frontend's production API URL, the backend's allowed frontend origin, and the Redis connection details through the respective hosting platforms' environment variables. Verify the live frontend can communicate with the deployed backend.
12. Group Members and Contributions
The following roles and contributions are based on the group's submitted contribution report.
Group member	Student number	Responsibility
Tsepiso Nthoko	901020658	Frontend Development: React customer interface, menu display, product presentation, shopping cart, responsive design and user experience.
Malaki Ratshosane	901021269	Backend Development: Express.js backend, product and order REST APIs, order creation, status updates, validation and error handling.
Litsitso Khaahlooe	901020648	Database Management: Redis integration, menu/order storage and retrieval, unique identifiers, persistence testing and troubleshooting.
Mzwake Mandla	9010121211	Staff Dashboard Development: Staff interface, product creation/editing/deletion, order processing, status management and sales summaries.
Mapotse Thebe	901020651	Testing and Documentation: Customer/staff functionality testing, cart and order tests, documentation, screenshots and test results.
Khopotso Beehle	901020613	System Integration and Deployment: Frontend/backend integration, Fetch API, GitHub integration, Netlify/Render deployment, debugging and final integration testing.


The report describes these as proposed responsibilities. The group should confirm the table accurately reflects work completed before submitting it as a final contribution record.
13. Collaboration
The team used GitHub for source-code management and integration. Group responsibilities covered frontend development, backend programming, database management, dashboard implementation, testing, documentation, and deployment.

For the final submission, retain the repository history and make sure each member's contributions can be explained during the demonstration.
14. Final Submission Checklist
- [ ] GitHub repository URL provided
- [ ] Deployed React frontend URL provided
- [ ] Deployed Express backend URL provided
- [ ] /api/health verified on Render
- [ ] Persistent Redis database connected and tested
- [ ] Customer menu, cart, and ordering demonstrated
- [ ] Staff menu management and order status changes demonstrated
- [ ] Staff-only API endpoints protected
- [ ] README and setup instructions verified
- [ ] Screenshots of application and database records included
- [ ] Group contribution report included
- [ ] All required tests and deployment checks completed
15. Conclusion
BREWHAUS Coffee Shop Management System is a group full-stack web development project that brings together React.js, Express.js, the Fetch API, and Redis. It aims to improve customer ordering and coffee shop administration while demonstrating REST API integration, key-value data storage, collaborative development, testing, and independent frontend/backend deployment.
