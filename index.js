class VGraph
{
   constructor(polygons)
   {
      this.polygons = polygons;
      this.graph    = [];
      this.plcoords = [];
      this.keys     = new Object();
   }
   
   getPrevPoint(pi, ci)
   {
      var coords = this.polygons[pi].geometry.coordinates[0];
      if (ci==0)
      {
         return coords[coords.length-2];
      }
      else
      {
         return coords[ci-1];
      }
   }
   
   getNextPoint(pi, ci)
   {
      var coords = this.polygons[pi].geometry.coordinates[0];
      if (ci==coords.length-1)
      {
         return coords[1];
      }
      else
      {
         return coords[ci+1];
      }
   }

   pointsAreTangentToPolygons(p1, p2)
   {

      var p1pt = p1.xy;
      var p1pp = this.getPrevPoint(p1.p, p1.c);
      var p1np = this.getNextPoint(p1.p, p1.c);

      var p2pt = p2.xy;
      var p2pp = this.getPrevPoint(p2.p, p2.c);
      var p2np = this.getNextPoint(p2.p, p2.c);

      var pp1check = this.getSide(p1pt, p2pt, p2pp);
      var np1check = this.getSide(p1pt, p2pt, p2np);

      var pp2check = this.getSide(p2pt, p1pt, p1pp);
      var np2check = this.getSide(p2pt, p1pt, p1np);

      if (((pp1check >= 0 && np1check >= 0) || (pp1check <= 0 && np1check <= 0)) && ((pp2check >= 0 && np2check >= 0) || (pp2check <= 0 && np2check <= 0)))
      {
         return true
      }
      else
      {
         return false;
      }
   }

   getSide(a, b, c)
   {
      return ((b[0] - a[0])*(c[1] - a[1]) - (b[1] - a[1])*(c[0] - a[0]));
   }
  
   lineGoInsidePolygon(line, poly)
   {
      var goinside      = 0;
      var splitter      = turf.polygonToLine(poly);
      var split         = turf.lineSplit(line, splitter);
      var checkMidPoint = function(lineSegment)
      {
         var cds       = turf.coordAll(lineSegment);
         var point1    = turf.point(cds[0]);
         var point2    = turf.point(cds[1]);
         var midpoint  = turf.midpoint(point1, point2);
         if (turf.booleanPointInPolygon(midpoint, poly))
         {
            var distance = turf.pointToLineDistance(midpoint, splitter,
            {
               units: 'meters'
            }
            );
            if (distance > 0.001)
            {
               goinside = 1;
            }
         }
      }
      if (split.features.length > 0)
      {
         for(var i=0;i<split.features.length;i++)
         {
            checkMidPoint(split.features[i]);
         }
      }
      else
      {
         checkMidPoint(line);
      }
      return goinside;
   }

   goesInsideAnyPoly(line)
   {
      var goes = 0;
      for(var i=0;i<this.polygons.length;i++)
      {
         var poly = this.polygons[i];
         if (this.lineGoInsidePolygon(line, poly))
         {
            goes=1;
            break;
         }
      }
      return goes;
   }

   checkPoly2polyPoint(pt1, pt2)
   {
      var line = turf.lineString([pt1.xy, pt2.xy]);
      if(!this.goesInsideAnyPoly(line))
      {
         this.addLine(pt1,pt2);
      }
   }
   
   addLine(pt1,pt2){
      var key    = Math.min(pt1.xy[0], pt2.xy[0])+"_"+Math.min(pt1.xy[1], pt2.xy[1])+'x'+Math.max(pt1.xy[0], pt2.xy[0])+"_"+Math.max(pt1.xy[1], pt2.xy[1]);
      if (!this.keys[key]){
         this.keys[key] = [];
         this.keys[key].push([pt1.c,pt2.c,pt1.p,pt2.p]);
         this.graph.push(turf.lineString([pt1.xy, pt2.xy]));
      } else {
         this.keys[key].push([pt1.c,pt2.c,pt1.p,pt2.p]);
         console.log(JSON.stringify(this.keys[key]));
      }
   }

   processGraph()
   {
      var _self = this;
      for(var p=0;p<this.polygons.length;p++)
      {
         var cds = turf.coordAll(this.polygons[p]);
         for (var c=0;c<cds.length-1;c++)
         {
            this.plcoords.push(
            {
               'p':p, 'c':c, 'xy':cds[c], 'sc':(c==0), 'ec':(c==cds.length-1)
            }
            );
         }
      }

      this.plcoords.forEach(function (pt1, i, p1Arr)
      {
         _self.plcoords.forEach(function (pt2, j, p2Arr)
         {
            if (i > j)
            {
               //if same polygon
               if (pt1.p==pt2.p)
               {
                  //if points are next to each other
                  if (i-j==1)
                  {
                     _self.addLine(pt1,pt2);
                  }
                  //if points are far (except s & e)
                  else
                  {
                     if (_self.pointsAreTangentToPolygons(pt1, pt2))
                     {
                        _self.checkPoly2polyPoint(pt1, pt2);
                     }
                  }
               }
               //if points are not same polygon
               else
               {
                  if (_self.pointsAreTangentToPolygons(pt1, pt2))
                  {
                     _self.checkPoly2polyPoint(pt1, pt2);
                  }
               }
            }
         }
         );
      }
      )
      return this.graph;
   }
}

//sample
var polygons  = [{"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[73.4281652688796,0.5646496380838215],[73.43863661287372,0.5650787706706382],[73.43400175569599,0.5577835124031623],[73.43794996736591,0.5512606855852908],[73.42928106782979,0.5467976946933248],[73.4193247079665,0.5516039924387854],[73.42086966035907,0.5613024028213971],[73.4281652688796,0.5646496380838215]]]},"properties":null},{"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[73.44919378755635,0.5594142179813133],[73.44464476106708,0.5595858711737378],[73.4482496499831,0.550488245092609],[73.44550306795185,0.5479134427284293],[73.45812017915792,0.54387958346841],[73.46610243318622,0.553234699722239],[73.45563108919208,0.5547795798931361],[73.44919378755635,0.5594142179813133]]]},"properties":null}];
var g         = new VGraph(polygons);
var gg        = g.processGraph();

$(gg).each(function()
{
   console.log(this)
}
)
