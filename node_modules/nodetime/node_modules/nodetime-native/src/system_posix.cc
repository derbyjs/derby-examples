
#include <node.h>
#include <sys/resource.h>
#include <sys/time.h>
#include <errno.h>

#include <v8.h>

using namespace v8;


Handle<Value> Time(const Arguments& args) {
  HandleScope scope;

  timeval tv;

  int ret = gettimeofday(&tv, 0);
  if (ret < 0) {
    return scope.Close(Undefined());
  }

  return scope.Close(Number::New((double)tv.tv_sec * 1e6 + (double)tv.tv_usec));
}


Handle<Value> CPUTime(const Arguments& args) {
  HandleScope scope;

  struct rusage ru;

  int ret = getrusage(RUSAGE_SELF, &ru);
  if (ret < 0) {
    return scope.Close(Undefined());
  }

  return scope.Close(Number::New((double)ru.ru_utime.tv_sec * 1e6 + (double)ru.ru_utime.tv_usec + (double)ru.ru_stime.tv_sec * 1e6 + (double)ru.ru_stime.tv_usec));
}
