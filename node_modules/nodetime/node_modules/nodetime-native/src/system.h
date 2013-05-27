
#ifndef SYSTEM_H_
#define SYSTEM_H_

#include <v8.h>

using namespace v8;

Handle<Value> Time(const Arguments& args);
Handle<Value> CPUTime(const Arguments& args);

#endif
