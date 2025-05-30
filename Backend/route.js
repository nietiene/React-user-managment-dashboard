const express = require("express");
const mysql = require("mysql2");
require("dotenv").config();
const router = express.Router();

const connection = mysql.createConnection({
    host: process.env.HOST_NAME,
    user: process.env.USER_NAME,
    password: process.env.PASSWORD,
    database: process.env.DATABASE_NAME,
});
connection.connect((err) => {
    if (err) {
        throw err;
    } else {
        console.log("Connected Successfully");
    }
});

//  function isAuthorized (req, res, next) {
//     if (!req.session.user) {
//         res.json({message: "UnAuthorized"});
//     } else {
//         next();
//     }
//  }

//  IsAdmin logged in 
 function isAdmin(req, res, next) {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    res.status(403).json("Access denied (admin only)");
 }

 function isUser(req, res, next) {
    if (req.session.user && req.session.user.role === 'user') {
        return next();
    } else {
        res.json({error: 'Login first'});
    }
 }

// handle login login
router.post('/login', (req, res) => {
    const { name, password } = req.body;
    const sqlLogin = "SELECT * FROM user WHERE name = ? AND password = ?";
    connection.query(sqlLogin, [ name, password ], (err, result) => {
        if (err) return res.status(500).json({error:"Login error"});
        if (result.length === 1) {
            const user = result[0];
            req.session.user = {
                id: user.id,
                name: user.name,
                role: user.role,
            };
          return res.json({
            message: "Login Successfully",
            role: user.role,
            id: user.id,
            name: user.name
          });
        } else {
            res.json({error:"Invalid credentials"});
        }
    });

});

// // logout 
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) res.status(500).json("Failed to log out");
        res.clearCookie('connect.id', {
            path: '/',
            httpOnly: true,
            sameSite: 'lax'
        });
        res.json("Logged Out");
    });
});

router.get('/session', (req, res) => {
    if (req.session.user) {
        res.json({ loggedIn: true, user: {
            id: req.session.user.id,
            name: req.session.user.name,
            role: req.session.user.role,
        }});
    } else {
        res.json({ loggedIn: false});
    }
})
// // Get All users
router.get('/api/users', isAdmin, (req, res) => {
    const sqlSelect = "SELECT * FROM user";
    connection.query(sqlSelect, (err, result) => {
        
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
          res.json(result);
        }
    });
});

// // get page from user

router.get('/user/user/:id', isUser, (req, res) => {
   const id = parseInt(req.params.id);
//    console.log("Requeste user ID:", id);
    if (isNaN(id)) {
     return res.status(400).json({ error: "Input valid id"}); 
   }
   const sql = "SELECT * FROM `user` WHERE id = ?";
   connection.query(sql, [id], (err, data) => {
    if (err) {
    //    console.error("SQL error:", err);
       return res.status(500).json("ERROR:" + err.message);
    }
  if (data.length === 0) {
    return res.status(404).json({error: " User Not Found"});
  }
     res.json({
        user: data[0],
        sessionUser: req.session.user || null
     })
   });
});

// get form to update
router.get('/user/update/:id', isUser,(req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
        return res.status(400).json({error: "Invalid id"});
    }
    const sql = "SELECT * FROM user WHERE id = ?";
    connection.query(sql, [id], (err, data)  => {
        if (err) {
            res.status(403).json({error:"Database error"});
        } if (data.length === 0) {
         return res.status(404).json({error: "User not found"})
        }
         res.json(data[0]);
    });
});

// perform update logic
router.post('/user/update/:id', isUser,(req, res) => {
    const id = parseInt(req.params.id);
    const { name, password } = req.body;
    const sql = "UPDATE user SET name = ?, password = ? WHERE id = ?";
    connection.query(sql, [name, password, id], (err) => {
        if (err) {
               res.status(500).json("Not Updated try again", err);
        }
       const fetchDataAgain = "SELECT * FROM user WHERE id = ?";
       connection.query(fetchDataAgain, [id], (err, data) => {
        if (err) {
            return res.status(500).json("Error in fetching data: ", err.message);
        } 
        res.json({
            user: data,
            sessionUser: req.session.user
        })
       })
    })
})

// make user delete only his account
router.get('/dlt/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const sql = "DELETE FROM user WHERE id = ?";

    connection.query(sql, [id], (err) => {
        if (err) {
            res.status(500).json({error: "User not deleted"});
        }
        res.json({message: "Account deleted Successfully now you can create another one if you want !!"});
    })
});


// handle register login
router.post('/register', (req, res) => {
    const { name, password } = req.body;
    const sql = "INSERT INTO user(name, password) VALUES(?,?)";

    connection.query(sql, [name, password], (err) => {
        if (err) {
            res.status(500).json({error: "Not registered try again !!"}, err);
        } 

     res.json({message: 'Account created successfully'});
    })
});

// Add New User
router.post('/add', isAdmin, (req, res) => {
    const {name, password, role} = req.body;
    const sqlInsert = `INSERT INTO user(name, password, role) VALUES(?, ?, ?)`;
    connection.query(sqlInsert, [name, password, role], (err) => {
       
        if (!err) {
           res.json("User Inserted")
        } else {
            res.status(500).json("data not inserted");
        }
    });
});

// // Update user 
router.get('/admin/update/:id', isAdmin, (req, res) => {
      const id = parseInt(req.params.id);
      const select= `SELECT * FROM user WHERE id = ?`;
      connection.query(select, id, (err, result) => {
      if (err || result.length === 0) return res.status(404).send("user not found");
      res.json({user: result[0]})
      });
    
});

// pushing codes
router.post('/admin/update/:id', isAdmin, (req, res) => {

    const id = parseInt(req.params.id);
    const {name, password} = req.body;
   
    const UpdateSql = `UPDATE user SET name = ? , password = ? WHERE id = ${id}`;
    connection.query(UpdateSql, [name, password], (err) => {
        if (err) {
            res.status(500).json("Data not updated", err);
        } else {
            res.json({ message: "Data Updated Successfully"});
        }
    });
});

router.get('/admin/delete/:id', isAdmin, (req, res) => {
    const id = parseInt(req.params.id);
    const deleteSql = `DELETE FROM user WHERE id = ?`;
    connection.query(deleteSql, id, (err) => {
       
        if (err) {
            res.status(500).json({message: "User Not Deleted"});
        } else {
            res.json({message:'User deleted'});
        }
    });
});

module.exports = router;
