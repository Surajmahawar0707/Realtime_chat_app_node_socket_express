const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server, { cors: { origin: "*" }});
const path = require("path");
const mysql = require("mysql")

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'app'
})

const xx = "dddd"
db.connect()
var a = [];
var ust_registered = false;
var all_users = []
var emails = []
var all_rooms = []
var roomids = []
var curr_active_users = []
var done = false;
var fetched = "0";
var u = [];
var m = null;
var isAdmin = false;
var curr_roomid = null;
var users_in_rooms = [];
async function ffff(){
    db.query("select * from rooms;", (err, result) => {
        if(err){
            db.end()
            console.log("ROOM ERROR");
        }else{
            for(let i=0; i<result.length; i++){
                all_rooms.push([result[i].roomid, result[i].roompass]);
                roomids.push(result[i].roomid);
            }
        }
    })
}

async function ff() {
    db.query("select * from users;", (err, result) => {
        if(err){
            db.end();
            console.log("QUERY ERROR")
        }else{
            for(let i=0; i<result.length; i++){
                all_users.push([result[i].email, result[i].password]);
                emails.push(result[i].email);
            }
        }
    })
}
ff();
ffff();

var islogin = false;
var curr_user_email = null;
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }))
app.use(express.static (__dirname));

app.get("/", function(err, res){
    res.render("index");
});

app.get("/signup", function(err, res){
    res.render("signup", {message: null, signupstatus: null});
})

app.get("/login", function(err, res){
    if(ust_registered){
        ust_registered = false;
        res.render("login", {message: null, signupstatus: "Account created! you can login now..."});
        return;
    }
    res.render("login", {message: null, signupstatus: null});
})

function isvalidp(p){
    return true;
}


app.post("/signup", function(req, res){
    const email = req.body.email;
    const p1 = req.body.p1;
    const p2 = req.body.p2;
    if(p1 !== p2){
        res.render("signup", {message: "Password didn't match!", signupstatus: null});
        return;
    }
    if(!isvalidp(p1) || !isvalidp(p2)){
        res.render("signup", {message: "password validation failes!", signupstatus: null});
        return;
    }
    
    if(emails.includes(email)){
        res.render("signup", {message: "email already registered!", signupstatus: null});
        return;
    }
    else{
        db.query("insert into users values(?, ?);", [email, p1], (err, result) => {
            if(err){
                console.log("INSERT ERROR!");
            }else{
                ust_registered = true;
                all_users.push([email, p1]);
                emails.push(email);
                res.redirect("/login");
            }
        })
    }
});

app.get("/:email", (req, res) => {
    curr_user_email = req.params.email;
    if(islogin){
        var temp = m;
        m = null;
        res.render("chat", {email: curr_user_email, message: temp});
        return;
    }else{
        res.render("login", {message: "login first to chat!", signupstatus: null});
        return;
    }
})

app.post("/login", (req, res) => {
    if(emails.includes(req.body.email)){
        if(all_users[emails.indexOf(req.body.email)][1] === req.body.p){
            islogin = true;
            curr_user_email = req.body.email;
            res.redirect("/"+curr_user_email);
            return;
        }else{
            res.render("login", {message: "Wrong Password!", signupstatus: null});
            return;
        }
    }else{
        res.render("login", {message: "Email doesn't exist!", signupstatus: null});
        return;
    }
})


app.post("/create/:email", (req, res) => {
    console.log(req.params.email);
    console.log("++++++++++++++++++")
    if(islogin){
        const roomid = parseInt(req.body.roomid);
        const roompass = req.body.roompass;
        if(roomids.includes(roomid)){
            m = "Someone has already created room with this id!"
            res.redirect("/"+req.params.email);
        }
        else{
            db.query("insert into rooms values(?, ?);", [roomid, roompass], (err, result) => {
                if(err){
                    console.log("INSERT ROOM ERROR!")
                    m = "ROOM CREATE ERROR!"
                    res.redirect("/"+req.params.email);
                    return;
                }else{
                    roomids.push(roomid);
                    all_rooms.push([roomid, roompass])
                    users_in_rooms.push([roomid, [req.params.email]])
                    db.query("insert into uinr values(?, ?, ?, ?);", [null, roomid, req.params.email, "admin"], (err, result) => {
                        if(err){
                            console.log("UINR INSERT ERROR!")
                            return;
                        }else{
                            db.query("select uemail from uinr where uinr.rid = ?;", roomid, (err, result) => {
                                if(err){
                                    console.log("SELECTING UEMAIL IN UINR ERROR!")
                                    return;
                                }else{
                                    curr_roomid = roomid;
                                    res.redirect("/"+req.params.email+"/"+roomid.toString());
                                }
                            })
                        }
                    })
                    
                }
            })
        }
    }
    else{
        res.render("login", {message: "login first to chat!", signupstatus: null});
        return;
    }
})



app.get("/:useremail/:roomid", function(req, res){
    isAdmin = false;
    db.query("select * from uinr where rid = ? and uemail = ? and role = 'admin';", [parseInt(req.params.roomid), req.params.useremail], (err, result) => {
        if(err){
            console.log("USER/CHAT ERROR")
        }else{
            if(result.length !== 0){
                isAdmin = true;
            }
            var u_in_r = [];
            console.log(u_in_r);
            var is_it_done = false;
            console.log(users_in_rooms);
            for(let i=0; i<users_in_rooms.length; i++){
                if(!is_it_done){
                    if(users_in_rooms[i][0] === parseInt(req.params.roomid)){
                        u_in_r = users_in_rooms[i][1];
                        is_it_done = true;
                    }   
                }
            }
            var newarr = [];
            if(u_in_r.length > 0){
                for(let i=0; i<u_in_r.length; i++){
                    if(u_in_r[i] !== req.params.useremail){
                        newarr.push(u_in_r[i])
                    }
                }
                u_in_r = newarr;
            }
            var temp = [];
            u_in_r.sort()
            console.log("33333333333333333333")
            console.log(u_in_r);
            if(u_in_r.length > 0){
                temp = [u_in_r[0]]
                for(let i=1; i<u_in_r.length; i++){
                    if(u_in_r[i-1] !== u_in_r[i]){
                        temp.push(u_in_r[i])
                    }
                }
            }
            u_in_r = temp;
            temp = [];
            console.log('0000000000000000000000000000')
            console.log(u_in_r);
            res.render("chatnow", {email: req.params.useremail, isAdmin: isAdmin, cau: u_in_r, room: parseInt(req.params.roomid)});            
        }
    })
})

app.post("/join/:email", function(req, res){
    if(islogin){
        console.log(req.params.email);
        const roomid = parseInt(req.body.roomid);
        const roompass = req.body.roompass.toString();
        console.log(roomids);
        if(roomids.includes(roomid)){
            if(all_rooms[roomids.indexOf(roomid)][1] === roompass){
                curr_roomid = roomid;
                console.log("xxxxxxxxxxxxxxxxxxxxxx")
                console.log(curr_roomid)
                db.query("select uemail from uinr where id > 0 and rid = ?;", roomid, (err, result) => {
                    if(err){
                        console.log("GETTING UEMAIL FROM UINR ERROR!")
                        return;
                    }else{
                        console.log("GETTING UNAME FROM UINR SUCCESS")
                        console.log(result);
                        var ind_room = 0;
                        var found = false;
                        users_in_rooms = [];
                        db.query("select rid, uemail from uinr where id>0;", (err, result1) => {
                            if(err){
                                console.log("JOIN SELECT RID ERROR!")
                            }else{
                                var temp = [];
                                for(let i=0; i<result1.length; i++){
                                    if(!temp.includes(result1[i].rid)){
                                        temp.push(parseInt(result1[i].rid))
                                        users_in_rooms.push([parseInt(result1[i].rid), [result1[i].uemail]])
                                    }
                                    else{
                                        users_in_rooms[temp.indexOf(parseInt(result1[i].rid))][1].push(result1[i].uemail)
                                    }
                                }
                                for(let i=0; i<users_in_rooms.length; i++){
                                    if(!found){
                                        if(users_in_rooms[i][0] === roomid){
                                            found = true;
                                        }else{
                                            ind_room += 1;
                                        }
                                    }
                                }
                                var temp = []
                                console.log(users_in_rooms)
                                console.log(ind_room)
                                for(let i=0; i<result1.length; i++){
                                    if(!temp.includes(parseInt(result1[i].rid))){
                                        temp.push(parseInt(result1[i].rid))
                                        users_in_rooms.push([parseInt(result1[i].rid), [result1[i].uemail]])
                                    }else{
                                        users_in_rooms[temp.indexOf(parseInt(result1[i].rid))][1].push(result1[i].uemail)
                                    }
                                }
                                console.log(users_in_rooms);
                                console.log("=======================")
                                done = true;
                                console.log("---------------------------")
                                console.log(users_in_rooms[ind_room][1]);
                                console.log("---------------------------")
                                
                                if(!users_in_rooms[ind_room][1].includes(req.params.email)){
                                    db.query("insert into uinr values(?, ?, ?, ?);", [null, req.body.roomid, req.params.email, "participent"], (err, result2) => {
                                        if(err){
                                            console.log("INSERT IN JOIN UINR ERROR");
                                        }else{
                                            console.log("INSERT IN JOIN UINR SUCCESS");
                                            console.log("oooooooooooooooooo")
                                            console.log(users_in_rooms[ind_room][1]);
                                            res.redirect("/" + req.params.email + "/" + curr_roomid.toString());
                                        }
                                    })
                                }else{
                                    console.log(users_in_rooms[ind_room][1]);
                                    res.redirect("/"+req.params.email+"/"+req.body.roomid.toString());
                                }
                            }
                        }) 
                    }
                })       
            }else{
                console.log(all_rooms)
                console.log(roomids)
                m = "Wrong password";
                res.redirect("/"+req.params.email);
            }
        }else{
            m = "Room id not available!"
            res.redirect("/"+req.params.email);
        }
    }
    else{
        res.render("login", {message: "login first to chat!", signupstatus: null});
        return;
    }
})


app.post("/abortroom/:email", (req, res) => {
    const rid = parseInt(req.body.roomid);
    db.query("delete from uinr where id > 0 and rid = ?;", rid, (err, result) => {
        if(err){
            console.log("DELETE ABORT ROOM ERROR!");
        }else{
            console.log("DELETE ABORT ROOM SUCCESS!")
            db.query("delete from rooms where roomid = ?;", rid, (err, result) => {
                if(err){
                    console.log("DELETE IN ROOMS ERROR!")
                }else{
                    var ind_room = 0;
                    var found = false;
                    for(let i=0; i<users_in_rooms.length; i++){
                        if(!found){
                            if(users_in_rooms[i][0] === rid){
                                found = true;
                            }else{
                                ind_room += 1;
                            }
                        }
                    }
                    var temp = []
                    for(let i=0; i<users_in_rooms.length; i++){
                        if(i !== ind_room){
                            temp.push(users_in_rooms[i])
                        }
                    }
                    users_in_rooms = temp;
                    temp = [];
                    for(let i=0; i<curr_active_users.length; i++){
                        if(curr_active_users[i][1] !== rid){
                            temp.push(curr_active_users[i])
                        }
                    }
                    curr_active_users = temp;
                    temp = []
                    var newarr = []
                    var newall = []
                    for(let i=0; i<roomids.length; i++){
                        if(roomids[i] !== rid){
                            newarr.push(roomids[i]);
                            newall.push(all_rooms[i]);
                        }
                    }
                    roomids = newarr;
                    all_rooms = newall;
                    res.redirect("/"+req.params.email);
                }
            })
            
        }
    })
})

app.post("/leaveroom/:email", (req, res) => {
    var rid = parseInt(req.body.roomid);
    var email = req.params.email.toString();
    var newarr = [];
    for(let i=0; i<curr_active_users.length; i++){
        if(curr_active_users[i] != [email, rid]){
            newarr.push(curr_active_users[i]);
        }
    }
    curr_active_users = newarr;
    var ind_room = 0;
    var found = false;
    for(let i=0; i<users_in_rooms.length; i++){
        if(!found){
            if(users_in_rooms[i][0] === rid){
                found = true;
            }else{
                ind_room += 1;
            }
        }
    }
    console.log(users_in_rooms[ind_room][1]);
    users_in_rooms[ind_room][1].pop(email);
    console.log("hhhhhhhhhhhhhhh");
    console.log(users_in_rooms[ind_room][1]);
    db.query("delete from uinr where id > 0 and rid = ? and uemail = ?;", [rid, email], (err, result) => {
        if(err){
            console.log("DELETE LEAVEROOM ERROR!")
        }else{
            res.redirect("/"+email);
        }
    })
})


server.listen(8080, () => {
    console.log("on port 8080");
})

io.on('connection', (socket) => {
    socket.on('gotnewuser', (data) => {
        console.log("-----------------")
        console.log(data.email);
        console.log(data.room);
        console.log("-----------------");
        if(!curr_active_users.includes([data.email, parseInt(data.room)])){
            curr_active_users.push([data.email, parseInt(data.room)])
            socket.broadcast.emit('newuser', {email: data.email, room: data.room});
        }
    })

    socket.on('newuser', (data) => {
        curr_active_users.push([data.email, data.room]);
    })

    socket.on('curr_user', (data) => {})

    socket.on('leaveroom', (data) => {
        socket.broadcast.emit('userleft', {email: data.email, room: parseInt(data.room)})
    })

    socket.on('deleteroom', (data) => {
        socket.broadcast.emit("delete", {room: data.room})
    });

    socket.on("newMessage", (data) => {
        var from = data.from;
        var to = data.to;
        console.log("roomid:", to);
        var message = data.message;
        db.query("insert into messages values(?, ?, ?, ?);", [null, from, to, message], (err, result) => {
            if(err){
                console.log("MESSAGE INSERT ERROR!")
            }else{
                socket.broadcast.emit("gotnewMessage", {from: from, to: to, message: message});
                console.log("MESSAGE INSERTED!")
            }
        })
    })
});