

#include <node.h>
#include <v8.h>
#include <errno.h>
#include "system.h"
#include "gc.h"
#include "profiler.h"

using namespace v8;


void Init(Handle<Object> target) {
  target->Set(String::NewSymbol("time"), FunctionTemplate::New(Time)->GetFunction());
  target->Set(String::NewSymbol("cpuTime"), FunctionTemplate::New(CPUTime)->GetFunction());
  target->Set(String::NewSymbol("afterGC"), FunctionTemplate::New(AfterGC)->GetFunction());
  target->Set(String::NewSymbol("startV8Profiler"), FunctionTemplate::New(StartV8Profiler)->GetFunction());
  target->Set(String::NewSymbol("stopV8Profiler"), FunctionTemplate::New(StopV8Profiler)->GetFunction());
  target->Set(String::NewSymbol("takeHeapSnapshot"), FunctionTemplate::New(TakeHeapSnapshot)->GetFunction());
}


NODE_MODULE(nodetime_native, Init);

