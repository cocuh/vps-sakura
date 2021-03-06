/*
 * here it is.
 * https://github.com/cocuh/2014-kakizome
 */

Vector3d = function (xx, yy, zz) {
    this.x = xx;
    this.y = yy;
    this.z = zz;

    this.set = function(xx,yy,zz){
        this.x = xx;
        this.y = yy;
        this.z = zz;
    };
    this.size = function () {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    };
    this.normalize = function () {
        var size = this.size();
        if (size === 0) {
            return;
        }
        this.x /= size;
        this.y /= size;
        this.z /= size;
    };
    this.duplicate = function () {
        return new Vector3d(this.x, this.y, this.z);
    };
};

Vector2d = function (xx, yy) {
    this.x = xx;
    this.y = yy;
    this.size = function () {
        return Math.sqrt(this.x * this.x + this.y * this.y)
    };
    
    this.normalize = function () {
        var size = this.size();
        if (size === 0) {
            return;
        }
        this.x /= size;
        this.y /= size;
    };
    
    this.duplicate = function(){
        return new Vector2d(this.x,this.y);
    };
};
SVGObj = function (elem) {
    this.elem = elem;
    this.setId = function (id) {
        this.elem.id = id;
    };
    this.setAttribute = function (key, value) {
        return this.elem.setAttributeNS(null, key, value)
    };
    this.setAttributeNS = function (namespace,key, value) {
        return this.elem.setAttributeNS(namespace, key, value)
    };
    this.setAttrDict = function (d) {
        var keys = Object.keys(d);
        for (var i = 0; i < keys.length; i++) {
            this.setAttribute(keys[i], d[keys[i]]);
        }
    };
    this.appendChild = function(child){
        this.elem.appendChild(child);
    };
};

SVGObj.xmlns = "http://www.w3.org/2000/svg";
SVGObj.xlinkns = "http://www.w3.org/1999/xlink";
SVGObj.createElement = function (tagname) {
    var elem = document.createElementNS(SVGObj.xmlns, tagname);
    var obj = new SVGObj(elem);
    var res = function () {
        return obj.elem
    };
    res.__proto__ = obj;
    return res;
};
/**
 * Created by cocu on 1/2/14.
 */
var Offset={'x':0,'y':0};

Point = function (vec) {
    this.vec = vec;
    this.ScaleFunction = 1000;
    this.pos = {};

    this.move = function (xx, yy, zz) {
        this.vec.x = xx;
        this.vec.y = yy;
        this.vec.z = zz;
    };
    this.calc_pos = function (matrix) {
        var res = [0,0];
        for (var i = 0; i < 2 ; i++) {
            var line = matrix[i];
            res[i]=line[0]*this.vec.x+line[1]*this.vec.y+line[2]*this.vec.z;
        }
        this.pos = {'x':res[0],'y':res[1]};
        return this.pos;
    };
    this.get_str_pos = function(matrix){
        var pos = this.calc_pos(matrix);
        var x = Math.floor(pos.x*this.ScaleFunction)/this.ScaleFunction+Offset.x;
        var y = Math.floor(pos.y*this.ScaleFunction)/this.ScaleFunction+Offset.y;
        return ''+x+','+y
    };
};


gen_tranformMatrix = function(view_vec){
    view_vec.normalize();
    var a = view_vec.x;
    var b = view_vec.y;
    var c = view_vec.z;
    var zoom = 75;
    var v1 = new Vector3d(c,0,-a);
    var v2_x = (a*b)/Math.sqrt(Math.abs(Math.pow(view_vec.size(),2)-2*a*a*b*b-2*b*b*c*c));
    var v2_y = -v2_x*(a*a+c*c)/(a*b);
    var v2_z = v2_x*c/a;
    if(a===0){v2_x=0;v2_y=-c;v2_z=b}
    if(b===0){v2_x=c;v2_y=0;v2_z=a}
    if(c===0){v2_x=b;v2_y=a;v2_z=0}
    var v2 = new Vector3d(v2_x,v2_y,v2_z);
    v1.normalize();
    v2.normalize();
    var matrix = [
        [v1.x,v1.y,v1.z],
        [v2.x,v2.y,v2.z],
        [a,b,c]
    ];
    for(var i = 0;i<3;i++){
        for(var j=0;j<3;j++){
            matrix[i][j]*=zoom;
        }
    }
    return matrix
};


Polygon = function (elem,point_array) {
    this.elem = elem;
    this.data = point_array;
    this.gen_d = function(matrix){
        var length = this.data.length;
        var res = '';
        for(var i = 0; i<length;i++){
            if(i===0){
                res+="M";
            }else{
                res+=" L";
            }
            res+=this.data[i].get_str_pos(matrix);
        }
        res+='Z';
        return res;
    };
    this.move=function(matrix){
        var d = this.gen_d(matrix);
        this.elem.setAttribute('d',d);
    };
};

Line = function(elem, point_array){
    this.elem = elem;
    this.data = point_array;
    this.move = function(matrix){
        var pos1 = this.data[0].calc_pos(matrix);
        var pos2 = this.data[1].calc_pos(matrix);
        this.elem.setAttrDict({
            'x1':pos1.x+Offset.x,
            'y1':pos1.y+Offset.y,
            'x2':pos2.x+Offset.x,
            'y2':pos2.y+Offset.y
        });
    };
};

Seane = function(iscript){
    var main_svg = document.getElementById('background_svg');
    var view_vec = new Vector3d(1,1,1);
    var script=iscript;
    var refresh = script.refresh;
    
    var points = [];
    var polygons = [];
    var lines = [];
    
    var count = 45;
    var main_g = null;
    
    this.init = function(){
        this.init_points(script.init_points());
        this.init_lines();
        this.init_polygons(script.init_polygons());
    };
    this.init_points = function(point_array){
        for(var i=0;i<point_array.length;i++){
            var line = point_array[i];
            var p = new Point(new Vector3d(line[0],line[1],line[2]));
            points.push(p);
        }
    };
    this.init_polygons = function(poly_array){
        var g = SVGObj.createElement('g');
        main_svg.appendChild(g());
        for(var i=0;i<poly_array.length;i++){
            var point_array = [];
            for(var j=0;j<poly_array[i].length;j++){
                point_array.push(points[poly_array[i][j]]);
            }
            var elem = SVGObj.createElement('path');
            elem.setAttribute('class','polygon');
            var p = new Polygon(elem,point_array);
            polygons.push(p);
            g.appendChild(elem());
        }
        main_g = g;
    };
    this.init_lines = function(){
        var elem_line_x = SVGObj.createElement('line');
        var elem_line_y = SVGObj.createElement('line');
        var elem_line_z = SVGObj.createElement('line');
        elem_line_x.setAttribute('class','line_x');
        elem_line_y.setAttribute('class','line_y');
        elem_line_z.setAttribute('class','line_z');
        var x1 = new Point(new Vector3d(100,0,0));
        var x2 = new Point(new Vector3d(-100,0,0));
        var y1 = new Point(new Vector3d(0,100,0));
        var y2 = new Point(new Vector3d(0,-100,0));
        var z1 = new Point(new Vector3d(0,0,100));
        var z2 = new Point(new Vector3d(0,0,-100));
        lines.push(new Line(elem_line_x,[x1,x2]))
        lines.push(new Line(elem_line_y,[y1,y2]))
        lines.push(new Line(elem_line_z,[z1,z2]))
        main_svg.appendChild(elem_line_x());
        main_svg.appendChild(elem_line_y());
        main_svg.appendChild(elem_line_z());
    };
    this.draw = function(){
        Offset.x = window.innerWidth*0.35;
        Offset.y = window.innerHeight*0.5;
        refresh(points);
        
        var s2 = Math.sqrt(2);
        count++;
        count %= 360;
        if( count == 90){return;}
        view_vec.set(s2 * Math.sin(2 * Math.PI * count / 360), 1, s2 * Math.cos(2 * Math.PI * count / 360));
        view_vec.normalize();
        
        var matrix = gen_tranformMatrix(view_vec);
        var i;
        for(i=polygons.length-1;i>=0;i--){
            polygons[i].move(matrix);
        }
        for(i=lines.length-1;i>=0;i--){
            lines[i].move(matrix);
        }
        
        if('next' in script){
            var next = script.next();
            if(next){
                return next;
            }
        }
        return null;
    };
    this.start = function(){
        this.init();
    };
    this.restart = function(inpscript){
        main_svg.removeChild(main_g())
        script = inpscript;
        polygons = [];
        points = [];
        refresh = script.refresh;
        this.init_points(script.init_points());
        this.init_polygons(script.init_polygons());
        this.draw()
    };
};
data = {};

(function () {



    var count = 0;
    var s2 = Math.sqrt(2);
    var s5 = Math.sqrt(5);
    var sin = function(ratio){return Math.sin(ratio)};
    var cos = function(ratio){return Math.cos(ratio)};
    var PI = Math.PI;
    data.triangle = {
        'init_points': function () {
            return [
                [0, 0, 1],
                [0, 1, 0],
                [1, 0, 0]
            ]
        },
        'init_polygons': function () {
            return [
                [0, 1, 2]
            ]
        },
        'refresh': function ( points) {
            points[1].vec.x = Math.cos(6 * Math.PI * count / 360);
            points[1].vec.z = Math.sin(6 * Math.PI * count++ / 360);
            count++;
            count %= 3600;
        },
        'next':function(){
            
        }
    };


    data.cube = {
        'init_points': function () {
            return [
                [1, 1, 1],
                [1, 1, -1],
                [1, -1, 1],
                [1, -1, -1],
                [-1, 1, 1],
                [-1, 1, -1],
                [-1, -1, 1],
                [-1, -1, -1]
            ]
        },
        'init_polygons': function () {
            return [
                [0, 1, 3, 2],
                [0, 2, 6, 4],
                [0, 1, 5, 4],
                [7, 3, 1, 5],
                [7, 3, 2, 6],
                [6, 7, 5, 4]
            ]
        },
        'refresh': function ( points) {
        },
        'next':function(){
        }
    };

    
    data.tsuru = {
        'init_points':function(){
            return [
                [5,0,0],
                [0,0,5],
                [-5,0,0],
                [0,0,-5]
            ]
        },
        'init_polygons':function(){
            return [[0,1,2,3]]
        },
        'refresh':function(points){
        },
        'next':function(){
            if(count>10){
                count = 0;
                return data.tsuru1;
            }else{
                count++;
            }
        }
    };
    

    data.tsuru1 = {
        'init_points': function () {
            return [
                [0, 0, 0],        //0
                [5, 0, 0],        //1
                [-5, 0, 0],        //2
                
                [0, 0, 5],        //3
                [5/2,0,5/2],      //4
                [-5/2,0,5/2],      //5
                
                [0, 0, -5],        //6
                [5/2,0,-5/2],      //7
                [-5/2,0,-5/2]      //8
            ];
        },
        'init_polygons': function () {
            return [
                [0, 1, 4],
                [0, 4, 3],
                [0,3,5],
                [0,5,2],
                
                [0, 1, 7],
                [0, 7, 6],
                [0,6,8],
                [0,8,2]
            ];
        },
        'refresh': function (points) {
            count++;
            var Max = 100;
            var n_Max = 130;
            
            if(count>n_Max){return}
            
            if(count>Max){
                var t = (count - Max)/(n_Max - Max);
                var r = Math.sqrt(25/4);
                var s = sin(PI/4+t*PI/4);
                var c = cos(PI/4+t*PI/4);
                points[4].vec.x =  s*r;
                points[4].vec.z =  c*r;
                points[5].vec.x = -s*r;
                points[5].vec.z =  c*r;
                points[7].vec.x =  s*r;
                points[7].vec.z = -c*r;
                points[8].vec.x = -s*r;
                points[8].vec.z = -c*r;
                
                return;
            }
            
            var t = count/Max;
            var top_y = t*5/2;
            points[0].vec.y = top_y;
            
            var y = top_y-5*sin(t*PI/2);
            var x = 5*cos(t*PI/2);
            var r = Math.sqrt(25/2-top_y*top_y);
            
            points[1].vec.y = y;
            points[2].vec.y = y;
            points[3].vec.y = y;
            points[6].vec.y = y;
            
            points[1].vec.x = x;
            points[2].vec.x = -x;
            points[3].vec.z = x;
            points[6].vec.z = -x;
            
            points[4].vec.x = r/s2;
            points[4].vec.z = r/s2;
            points[5].vec.x = -r/s2;
            points[5].vec.z = r/s2;
            points[7].vec.x = r/s2;
            points[7].vec.z = -r/s2;
            points[8].vec.x = -r/s2;
            points[8].vec.z = -r/s2;
            
        },
        'next':function(){
            if(count == 140){
                count = 0;
                return data.tsuru2;
            }
        }
    };
    
    data.tsuru2 = {
        'init_points':function(){
            return [
                [0,5/2,0],
                
                [5/4,5/4,0],//1
                [-5/4,5/4,0],//2
                [-5/4,5/4,0],//3
                [5/4,5/4,0],//4
                
                [5/2,0,0],//5
                [-5/2,0,0],//6
                [-5/2,0,0],//7
                [5/2,0,0],//8
                
                [0,-5/2,0],//9
                [0,-5/2,0],//10
                [0,-5/2,0],//11
                [0,-5/2,0]//12
            ]
        },
        'init_polygons':function(){
            return [
                [0,1,2],
                [0,3,4],
                
                [0,9,1],
                [0,9,4],
                [0,11,2],
                [0,11,3],
                
                [1,2,10],
                [3,4,12],
                
                [1,5,9],
                [1,5,10],
                [2,6,10],
                [2,6,11],
                [3,7,11],
                [3,7,12],
                [4,8,12],
                [4,8,9]
            ]
        },
        'refresh':function(points){count++;
            var Max = 100;
            var ratio = count/Max;
            if(count>Max){return}
            
            var base_y=(1-ratio)*5/4;
            
            var by = -cos(PI*ratio)*5*3/4+base_y;
            var bx = sin(PI*ratio)*5*3/4;
            points[10].vec.y = by;
            points[12].vec.y = by;
            points[10].vec.z = bx;
            points[12].vec.z = -bx;
            
            var mx = cos(PI*ratio)*5/4+5/4;
            var my = 0;
            var mz = points[10].vec.z/2;
            points[5].vec.x = mx;
            points[6].vec.x = -mx;
            points[7].vec.x = -mx;
            points[8].vec.x = mx;
            
            points[5].vec.y = my;
            points[6].vec.y = my;
            points[7].vec.y = my;
            points[8].vec.y = my;
            
            points[5].vec.z = mz;
            points[6].vec.z = mz;
            points[7].vec.z = -mz;
            points[8].vec.z = -mz;
            
            points[0].vec.y = 5/4+base_y;
            points[1].vec.y = base_y;
            points[2].vec.y = base_y;
            points[3].vec.y = base_y;
            points[4].vec.y = base_y;
            points[9].vec.y = -5/2-5/4+base_y;
            points[11].vec.y = -5/2-5/4+base_y;
        },
        'next':function(){
            if(count == 110){
                count = -3;
                return data.tsuru3
            }
        }
    }
    
    data.tsuru3 = {
        'init_points':function(){
            var i = 0.54;
            var j = 0.45;
            return[
                [0,5/4,0],          //0
                
                [5/4,0,0],          //1
                [-5/4,0,0],         //2
                [-5/4,0,0],         //3
                [5/4,0,0],          //4
                
                [0,-5*3/4,0],       //5
                [0,5*3/4,0],        //6
                [0,-5*3/4,0],       //7
                [0,5*3/4,0],        //8
                
                [ i*5/4,(1-i)*5*3/4,0],        //9
                [-i*5/4,(1-i)*5*3/4,0],      //10
                [-i*5/4,(1-i)*5*3/4,0],      //11
                [ i*5/4,(1-i)*5*3/4,0],        //12
                
                [ j*5/4,(1-j)*5/4,0],          //13
                [-j*5/4,(1-j)*5/4,0],        //14
                [-j*5/4,(1-j)*5/4,0],        //15
                [ j*5/4,(1-j)*5/4,0],          //16
                
                [ 0.4*5/4,0,0],     //17
                [-0.4*5/4,0,0],    //18
                [-0.4*5/4,0,0],    //19
                [ 0.4*5/4,0,0],     //20
                
                [0,0,0]
            ]
        },
        'init_polygons':function(){
            return [
                [0,15,19,21,20,16],
                [0,13,17,21,18,14],
                
                [1,13,17],
                [2,14,18],
                [3,15,19],
                [4,16,20],
                
                [1,9,17],
                [2,10,18],
                [3,11,19],
                [4,12,20],
                
                [6,9,17,21],
                [6,10,18,21],
                [8,11,19,21],
                [8,12,20,21],
                
                [1,17,5],
                [2,18,7],
                [3,19,7],
                [4,20,5]
            ]
        },
        'refresh':function(points){count++;
            if(count<0){return}
            var Max = 100;
            var Max2 = 200;
            var min2 = 110;
            if(Max > count){
                var t = count/Max;
                var mx = cos(PI*t)*(5/8)+5/8;
                var my = t*5/16
                var mz = sin(PI*t)*(5/8);
                points[1].vec.x = mx;
                points[2].vec.x = -mx;
                points[3].vec.x = -mx;
                points[4].vec.x = mx;
                points[1].vec.y =  my;
                points[2].vec.y =  my;
                points[3].vec.y =  my;
                points[4].vec.y =  my;
                points[1].vec.z =  mz;
                points[2].vec.z =  mz;
                points[3].vec.z = -mz;
                points[4].vec.z = -mz;
            }else if(Max2-6>count && min2<count){
                var t = (count-min2)/(Max2-min2);
                var bx = 5*3/4*sin(t*PI);
                var by = -5*3/4*cos(t*PI);
                points[5].vec.x=bx;
                points[5].vec.y=by;
                points[7].vec.x=-bx;
                points[7].vec.y=by;
                
                var mz = 0.5*sin((count-min2)/(Max2-min2-6)*PI);
                points[9].vec.z =  mz;
                points[10].vec.z =  mz;
                points[11].vec.z = -mz;
                points[12].vec.z = -mz;
                points[13].vec.z =  mz;
                points[14].vec.z =  mz;
                points[15].vec.z = -mz;
                points[16].vec.z = -mz;
                points[17].vec.z =  mz;
                points[18].vec.z =  mz;
                points[19].vec.z = -mz;
                points[20].vec.z = -mz;
            }else{
                return;
            }
        },
        'next':function(){
            if(count>210){
            count = 0;
                return data.tsuru4}
        }
    }
     
    data.tsuru4 = {
        'init_points':function(){
            var i = 0.54;
            var j = 0.45;
            var x = 0.6;
            var y = 0.7;
            return[
                [0,5/4,0],          //0
                
                [ 0,5/16,0],          //1
                [ 0,5/16,0],         //2
                [ 0,5/16,0],         //3
                [ 0,5/16,0],          //4
                
                [0.9,3.638,0],       //5
                [0,5*3/4,0],        //6
                [-0.9,3.638,0],       //7
                [0,5*3/4,0],        //8
                
                [ i*5/4,(1-i)*5*3/4,0.018],        //9
                [-i*5/4,(1-i)*5*3/4,0.018],      //10
                [-i*5/4,(1-i)*5*3/4,-0.018],      //11
                [ i*5/4,(1-i)*5*3/4,-0.018],        //12
                
                [ j*5/4,(1-j)*5/4,0.018],          //13
                [-j*5/4,(1-j)*5/4,0.018],        //14
                [-j*5/4,(1-j)*5/4,-0.018],        //15
                [ j*5/4,(1-j)*5/4,-0.018],          //16
                
                [ 0.4*5/4,0,0.018],     //17
                [-0.4*5/4,0,0.018],    //18
                [-0.4*5/4,0,-0.018],    //19
                [ 0.4*5/4,0,-0.018],     //20
                
                [0,0,0],
                
                [0.88*x,3.638*x,0], //22
                [0.9*y+(1-y)*0.4*5/4,3.638*y,0],//23
                
                [0,(5/4)/4,0],//24
                [0,(5/4)/4,0]//25
            ]
        },
        'init_polygons':function(){
            return [
                [0,15,19,21,20,16],
                [0,13,17,21,18,14],
                
                [1,13,17],
                [2,14,18],
                [3,15,19],
                [4,16,20],
                
                [1, 9,13,17],
                [2,10,14,18],
                [3,11,15,19],
                [4,12,16,20],
                
                [6, 9,13,17,21],
                [6,10,14,18,21],
                [8,11,15,19,21],
                [8,12,16,20,21],
                
                [1,17,23,22],
                [2,18,7],
                [3,19,7],
                [4,20,23,22],
                [22,23,5],
                [22,23,5],
                
                [13,24,16,15,25,14]
            ]
        },
        'refresh':function(points){count++;
            var Max1 = 30;
            var Max2 = 120;
            if(Max1>count){
                var dx = 0.7;
                var dy = -1.6;
                
                points[5].vec.x += dx/Max1;
                points[5].vec.y += dy/Max1;
            }else if(Max2 > count){
                var t = (count-Max1)/(Max2-Max1);
                var ty = -sin(t*PI/2)*(5*3/4-0.6875)+5*3/4;
                var tz = sin(t*PI/2)*(5*3/4-0.6875);
                points[6].vec.y = ty;
                points[8].vec.y = ty;
                points[6].vec.z = tz;
                points[8].vec.z = -tz;
                
                var my = ty*(1.725/(5*3/4));
                var mz = 0.018+tz*(1.725/(5*3/4))
                
                points[9].vec.y = my
                points[9].vec.z = mz
                points[10].vec.y = my
                points[10].vec.z = mz
                points[11].vec.y = my
                points[11].vec.z = -mz
                points[12].vec.y = my
                points[12].vec.z = -mz
                
                var dz = 0.4/(Max2-Max1);
                points[13].vec.z+=dz;
                points[14].vec.z+=dz;
                points[15].vec.z-=dz;
                points[16].vec.z-=dz;
                
                var dy = 0.3/(Max2-Max1);
                points[0].vec.y-=dy*1;
                points[13].vec.y-=dy;
                points[14].vec.y-=dy;
                points[15].vec.y-=dy;
                points[16].vec.y-=dy;
                
                points[7].vec.y -= 1.2*dy;
                points[7].vec.x -= 1.2*dy;
            }
        }
    }
})();

var resize = function(){
    var width = window.innerWidth;
    var height = window.innerHeight;
    var xmlns=SVGObj.xmlns;
    document.getElementById('nav').setAttribute('x',width-400)
    document.getElementById('nav').setAttribute('y',0.1*height)
};
//var slide = function(){
//    var ul = document.getElementById('nav_ul').getElementsByClassName('nav_li');
//    for(var i = 0 ;i<ul.length;i++){
//        i.addEventListener('mouseover');
//    }
//}

main = function () {

    var data_set = null;
    if (window.location.search) {
        data_set = data[window.location.search.slice(1)];
    }
    if (!data_set) {
        data_set = data['tsuru'];
    }
    var s = new Seane(data_set);
    s.start();
    s.draw();
    
    drawer = function(){
        var next = s.draw();
        if(!next){
            setTimeout(drawer,30)
        }else{
            s.restart(next);
            setTimeout(drawer,30)
        }
    };
    drawer();
    
    resize();
    window.addEventListener('resize',resize);
};
