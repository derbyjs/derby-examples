
#include <windows.h>

#include <v8.h>

using namespace v8;


static double filetimeToMicroseconds(FILETIME* ft) {
  ULARGE_INTEGER uli;
  uli.LowPart = ft->dwLowDateTime;
  uli.HighPart = ft->dwHighDateTime;

  return (double)(uli.QuadPart/10);
}


Handle<Value> Time(const Arguments& args) {
  HandleScope scope;

  FILETIME stime;
  GetSystemTimeAsFileTime(&stime);

  return scope.Close(Number::New(filetimeToMicroseconds(&stime)));
}


Handle<Value> CPUTime(const Arguments& args) {
  HandleScope scope;

  HANDLE proc = GetCurrentProcess();

  FILETIME ctime;
  FILETIME etime;
  FILETIME ktime;
  FILETIME utime;
  int ret = GetProcessTimes(proc, &ctime, &etime, &ktime, &utime);
  if(!ret) {
    return scope.Close(Undefined());
  }

  return scope.Close(Number::New(filetimeToMicroseconds(&ktime) + filetimeToMicroseconds(&utime)));
}
