

#ifndef GC_H_
#define GC_H_

#include <v8.h>
#include <node.h>

using namespace v8;

Handle<Value> AfterGC(const Arguments& args);

#endif
