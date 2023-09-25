using System;
using System.IO;
using System.Reflection;
using System.Runtime.ExceptionServices;
using Newtonsoft.Json.Schema;
using Newtonsoft.Json.Schema.Generation;
class Program
{
  public static string binFolderPath;
  public static string assemblyName;
  static void Main(string[] argv)
  {
    binFolderPath = argv[0];
    var command = argv[1];
    var name = argv[2];
    var cwd = argv[3];    
    var typeName = argv[4];    
    Program.assemblyName = typeName;
    if (!Directory.Exists(binFolderPath))
    {
      binFolderPath = Path.Combine(cwd, typeName, "bin", "Debug", "net6.0");
    }

    if (!Directory.Exists(binFolderPath))
    {
      throw new Exception("Could not find bin folder. Please run 'dotnet build' from the project root.");
    }

    if (command == "list")
    {
      ListTypes();
    }
    if (command == "schema")
    {
      GetSchema(argv[0], argv[2]);
    }
  }

  private static void GetSchema(string path, string typeName)
  {
    var assembly = ListTypes(true);

    var type = assembly.GetType(typeName);
    JSchemaGenerator generator = new JSchemaGenerator();    
    JSchema schema = generator.Generate(type);
    Console.WriteLine(schema);
  }

  public static Assembly ListTypes(bool mute = false)
  {

    string assemblyFileName = Program.assemblyName;

    // Combine the folder path and assembly file name to get the full path to the assembly
    string assemblyPath = Path.Combine(binFolderPath, assemblyFileName);

    AssemblyResolver.Attach();
    // Load the assembly
    Assembly assembly = Assembly.LoadFile(assemblyPath);

    // Get all public types in the assembly
    Type[] publicTypes = assembly.GetExportedTypes();

    if (!mute)
    {
      foreach (Type type in publicTypes)
      {
        Console.WriteLine(type.FullName);
      }
    }

    return assembly;
  }
}



public static class AssemblyResolver
{
  public static void Attach()
  {
#pragma warning disable CS8622
    AppDomain.CurrentDomain.AssemblyResolve += ResolveDependency;
  }
  private static List<string> loadedAssemblies = new List<string>();
  private static Assembly? ResolveDependency(object sender, ResolveEventArgs args)
  {
    var name = args.Name.Split(",")[0];
    string path = Path.Combine(Program.binFolderPath, name);
    if (loadedAssemblies.Contains(args.Name)) return null;
    loadedAssemblies.Add(args.Name);
    if (File.Exists(path))
    {
      return Assembly.LoadFrom(path);
    }
    return Assembly.Load(args.Name);
  }
}