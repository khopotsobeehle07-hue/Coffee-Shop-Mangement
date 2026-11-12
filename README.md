BREWHAUS Coffee Shop Management System
Module: BIWA2110 – Web Application Development
Project: Coffee Shop Management Web Application
Overview
BREWHAUS is a full-stack coffee shop management application. Customers can browse the menu, manage a cart, place orders and track their status. Staff can manage menu items, process orders and review sales information.
Technologies
- Frontend: React.js, Fetch API (Netlify)
- Backend: Node.js, Express.js REST API (Render)
- Database: Redis key-value NoSQL
- Collaboration: GitHub
Main Features
- Customers: Browse menu items, add to cart, place orders and track orders.
- Staff: Add, edit and delete menu items; view orders; update order status (Pending, Preparing, Ready, Collected); review order summaries.
- Storage: Menu items and orders stored as key-value records in Redis.
Run Locally
Install Node.js and configure the required environment variables using the .env.example files in client/ and Server/.

Frontend (first terminal):
cd client
npm install
npm run dev
Backend (second terminal, from the project root):
cd Server
npm install
npm run dev
Ensure Redis is configured and running. If the backend uses a different start script, follow Server/package.json.
REST API
Method	Endpoint	Purpose
GET	/api/menu	List menu items
GET	/api/menu/:id	Get menu item
POST	/api/menu	Add menu item
PUT	/api/menu/:id	Update menu item
DELETE	/api/menu/:id	Delete menu item
GET	/api/orders	List orders
GET	/api/orders/:id	Get order
POST	/api/orders	Place order
PATCH	/api/orders/:id/status	Update order status
GET	/api/health	Check backend health


Deployment
- Frontend (Netlify): Add live URL here
- Backend (Render): Add live URL here
- GitHub repository: Add repository URL here
Group Contributions
Member	Student Number	Responsibility
Tsepiso Nthoko	901020658	Frontend development
Malaki Ratshosane	901021269	Backend development
Litsitso Khaahlooe	901020648	Database management
Mzwake Mandla	9010121211	Staff dashboard
Mapotse Thebe	901020651	Testing and documentation
Khopotso Beehle	901020613	Integration and deployment


Before submission: Add the real deployment links, confirm the commands and features against the final code, and include screenshots and the group contribution report.
