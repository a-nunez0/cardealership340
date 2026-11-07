import express from "express";

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Car Dealership</title>
      </head>
      <body>
        <h1>Car Dealership</h1>
        <p>My CSE 340 final project is under development.</p>
      </body>
    </html>
  `);
});

export default app;
