

#include "gc.h"

using namespace v8;


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

  uv_queue_work(uv_default_loop(), &baton->request, Noop, (uv_after_work_cb)GCEpilogueAsync);
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


