export default function Loading() {
  return (
    <div className="space-y-6 p-6 md:p-10 animate-pulse">
       <div className="h-10 w-48 bg-secondary/30 rounded-lg"></div>
       <div className="grid gap-4 md:grid-cols-3">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-secondary/20 rounded-xl" />)}
       </div>
       <div className="h-[400px] bg-secondary/20 rounded-xl" />
    </div>
  )
}
