
#ifndef PROFILER_H_
#define PROFILER_H_

#include <v8.h>

using namespace v8;

Handle<Value> StartV8Profiler(const Arguments& args);
Handle<Value> StopV8Profiler(const Arguments& args);
Handle<Value> TakeHeapSnapshot(const Arguments& args);

#endif
