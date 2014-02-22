

/*
 * This file is depricated. Kept for old npm versions defaulting to node-waf
 */

#include <node.h>
#include <v8.h>
#include <v8-profiler.h>
#include <stdio.h>
#include <sys/resource.h>
#include <sys/time.h>
#include <errno.h>

using namespace v8;


/* Time */

Handle<Value> Time(const Arguments& args) {
  HandleScope scope;

  timeval tv;

  int ret = gettimeofday(&tv, 0);
  if (ret < 0) {
    return scope.Close(Undefined());
  }

  return scope.Close(Number::New((double)tv.tv_sec * 1e6 + (double)tv.tv_usec));
}


/* CPU time */

Handle<Value> CPUTime(const Arguments& args) {
  HandleScope scope;

  struct rusage ru;

  int ret = getrusage(RUSAGE_SELF, &ru);
  if (ret < 0) {
    return scope.Close(Undefined());
  }

  return scope.Close(Number::New((double)ru.ru_utime.tv_sec * 1e6 + (double)ru.ru_utime.tv_usec + (double)ru.ru_stime.tv_sec * 1e6 + (double)ru.ru_stime.tv_usec));
}




/* CPU profiler */

void Walk(int* next_uid, const int parent_uid, const CpuProfileNode* node, Local<Function> callback) {
  if(!node) return;

  int uid = (*next_uid)++;

  Handle<Value> argv[6];
  argv[0] = Integer::New(parent_uid);
  argv[1] = Integer::New(uid);
  argv[2] = Number::New(node->GetTotalSamplesCount()); 
  argv[3] = node->GetFunctionName();
  argv[4] = node->GetScriptResourceName();
  argv[5] = Integer::New(node->GetLineNumber()); 

  callback->Call(Context::GetCurrent()->Global(), 6, argv);

  int32_t childrenCount = node->GetChildrenCount();
  for(int i = 0; i < childrenCount; i++) {
    const CpuProfileNode* childNode = node->GetChild(i);
    Walk(next_uid, uid, childNode, callback);
  }
}


Handle<Value> StartV8Profiler(const Arguments& args) {
  HandleScope scope;

  CpuProfiler::StartProfiling(String::New("v8tools-cpu-profile"));

  return scope.Close(Undefined());
}


Handle<Value> StopV8Profiler(const Arguments& args) {
  HandleScope scope;

  const CpuProfile* profile = CpuProfiler::StopProfiling(String::New("v8tools-cpu-profile"));

  if(args.Length() > 0 && args[0]->IsFunction()) {
     Local<Function> callback = Local<Function>::Cast(args[0]);
     int nextUid = 1;
     Walk(&nextUid, 0, profile->GetTopDownRoot(), callback);
  }

  const_cast<v8::CpuProfile*>(profile)->Delete();

  return scope.Close(Undefined());
}



/* Heap profiler */


/*

node type:
  0 - hidden  
  1 - array
  2 - string
  3 - object
  4 - compiled code
  5 - function clojure
  6 - regexp
  7 - heap number
  8 - native object

edge type:
  0 - context variable
  1 - array element
  2 - property
  3 - internal
  4 - internal (size calculation)
  5 - internal (size calculation)
*/


static void IterateHeapSnapshot(const HeapSnapshot* snapshot, Local<Function> callback) {
  int32_t nodes_count = snapshot->GetNodesCount();
  for(int i = 0; i < nodes_count; i++) {
    const HeapGraphNode* node = snapshot->GetNode(i);

    int32_t children_count = node->GetChildrenCount();
    for(int j = 0; j < children_count; j++) {
      const HeapGraphEdge* child_edge = node->GetChild(j);
      const HeapGraphNode* child_node = child_edge->GetToNode();

      Handle<Value> argv[7];
      argv[0] = Integer::New(node->GetId());
      argv[1] = Integer::New(child_node->GetId());
      argv[2] = child_node->GetName(); 
      argv[3] = Integer::New(child_node->GetType());
      argv[4] = Integer::New(child_node->GetSelfSize());
      argv[5] = child_edge->GetName(); 
      argv[6] = Integer::New(child_edge->GetType());

      callback->Call(Context::GetCurrent()->Global(), 7, argv);
    }
  } 
}



Handle<Value> TakeHeapSnapshot(const Arguments& args) {
  HandleScope scope;

  const HeapSnapshot* snapshot = HeapProfiler::TakeSnapshot(String::New("v8tools-heap-snapshot"));
  if(args.Length() > 0 && args[0]->IsFunction()) {
     Local<Function> callback = Local<Function>::Cast(args[0]);
     IterateHeapSnapshot(snapshot, callback);
  }

  const_cast<v8::HeapSnapshot*>(snapshot)->Delete();

  return scope.Close(Undefined());
}



/* GC listener */


Persistent<Function> callback;
Persistent<Object> callback_context;


struct Baton {
  uv_work_t request;
  GCType gc_type;
  GCCallbackFlags gc_callback_flags;
  size_t used_heap_size;
};


static void Noop(uv_work_t* request) {
}


static void GCEpilogueAsync(uv_work_t* request) {
  Baton *baton = static_cast<Baton*>(request->data);

  Handle<Value> argv[3];

  switch(baton->gc_type) {
  case kGCTypeAll:
    argv[0] = String::New("kGCTypeAll");
    break;
  case kGCTypeMarkSweepCompact:
    argv[0] = String::New("kGCTypeMarkSweepCompact");
    break;
  case kGCTypeScavenge:
    argv[0] = String::New("kGCTypeScavenge");
    break;
  default:
    argv[0] = String::New("Other");
  }

  switch(baton->gc_callback_flags) {
  case kGCCallbackFlagCompacted:
    argv[1] = String::New("kGCCallbackFlagCompacted");
    break;
  case kNoGCCallbackFlags:
    argv[1] = String::New("kNoGCCallbackFlags");
    break;
  default:
    argv[1] = String::New("Other");
  }

  argv[2] = Integer::New(baton->used_heap_size);

  callback->Call(callback_context, 3, argv);

  delete baton;
}


static size_t GetUsedHeapSize() {
  HeapStatistics stats;
  V8::GetHeapStatistics(&stats);

  return stats.used_heap_size();
}


static void GCEpilogue(GCType gc_type, GCCallbackFlags gc_callback_flags) {
  Baton *baton = new Baton();
  baton->request.data = baton;

  baton->gc_type = gc_type;
  baton->gc_callback_flags = gc_callback_flags;

  baton->used_heap_size = GetUsedHeapSize();

  uv_queue_work(uv_default_loop(), &baton->request, Noop, GCEpilogueAsync);
}


Handle<Value> AfterGC(const Arguments& args) {
  HandleScope scope;


  if(args.Length() > 0 && args[0]->IsFunction()) {
    Local<Function> callbackArg = Local<Function>::Cast(args[0]);
    callback = Persistent<Function>::New(callbackArg);
    callback_context = Persistent<Object>::New(Context::GetCalling()->Global());
  }
  else {
    return scope.Close(Undefined());
  }


  V8::AddGCEpilogueCallback(GCEpilogue);

  return scope.Close(Undefined());
}



void Init(Handle<Object> target) {
  target->Set(String::NewSymbol("time"), FunctionTemplate::New(Time)->GetFunction());
  target->Set(String::NewSymbol("cpuTime"), FunctionTemplate::New(CPUTime)->GetFunction());
  target->Set(String::NewSymbol("startV8Profiler"), FunctionTemplate::New(StartV8Profiler)->GetFunction());
  target->Set(String::NewSymbol("stopV8Profiler"), FunctionTemplate::New(StopV8Profiler)->GetFunction());
  target->Set(String::NewSymbol("takeHeapSnapshot"), FunctionTemplate::New(TakeHeapSnapshot)->GetFunction());
}


NODE_MODULE(nodetimenative, Init);

