// ix n has children 2n+1 and 2n+2
// key at ix n is smaller than its children

function heappush(h,k,v){
  let l = h.length
  h.push(l)
  heapfix(h,l)
}

function heappop(h){
  let res = h[0]
  let k = 0
  while ((k*2+2) < h.length){
    let l = h[k*2+1]
    let r = h[k*2+2]
    if (l[0]<r[0]){
      h[k] = l
      k = k*2+1
    } else {
      h[k] = r
      k = k*2+2
    }
  }
  if((k*2+1) < h.length){
    h[k] = h[k*2+1]
    k = k*2+1
  }
  heapfix(h,k)
  return res
}

function heapfix(h,l){
  let p
  while (l>0 && h[p=(l-1)>>1][0] > h[l][0] ){
    ;[h[p],h[l]] =[h[l],h[p]]
    l=p
  }
}
